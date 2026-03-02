import { generateText, tool } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { pendingApprovals, meetings, companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays, format, setHours, setMinutes } from "date-fns";
import { getAvailableSlots } from "@/lib/integrations/calendar";

// --- Extracted pure logic for testability ---

export type TimeSlot = {
  date: string;
  time: string;
  available: boolean;
};

export function generateAvailableSlots(baseDate: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < 3; i++) {
    const date = addDays(baseDate, i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    slots.push(
      {
        date: format(date, "yyyy-MM-dd"),
        time: "10:00 AM ET",
        available: true,
      },
      {
        date: format(date, "yyyy-MM-dd"),
        time: "2:00 PM ET",
        available: true,
      },
      {
        date: format(date, "yyyy-MM-dd"),
        time: "4:00 PM ET",
        available: i !== 1,
      }
    );
  }
  return slots;
}

export async function runSchedulerAgent({
  messages,
  companyId,
  conversationId,
  prospectId,
  prospectContext,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  companyId: string;
  conversationId: string;
  prospectId?: string;
  prospectContext?: string;
}) {
  const result = await generateText({
    model: agentModel,
    system: `You are a helpful scheduling assistant for a B2B company.
Your job is to help prospects book demos and meetings with the sales team.

RULES:
- Always check availability before suggesting times
- Offer 2-3 time slot options
- All meetings need approval from the sales team before being confirmed
- Be accommodating about timezone preferences
- Standard demo duration is 30 minutes, deep-dive is 60 minutes
- Available hours are typically 9 AM - 5 PM ET, Monday through Friday
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`,
    messages,
    tools: {
      checkAvailability: tool({
        description: "Check team availability for scheduling a meeting",
        parameters: z.object({
          preferredDate: z
            .string()
            .optional()
            .describe("Preferred date (YYYY-MM-DD format)"),
          duration: z
            .enum(["30", "60"])
            .optional()
            .describe("Meeting duration in minutes"),
        }),
        execute: async ({ preferredDate, duration = "30" }) => {
          const baseDate = preferredDate
            ? new Date(preferredDate)
            : addDays(new Date(), 1);

          // Try real Google Calendar, fall back to generated slots
          let slots;
          try {
            slots = await getAvailableSlots({
              startDate: baseDate,
              durationMinutes: parseInt(duration),
            });
          } catch {
            slots = generateAvailableSlots(baseDate);
          }

          return {
            slots: slots.filter((s) => s.available),
            duration: `${duration} minutes`,
            note: "All times are in Eastern Time (ET)",
          };
        },
      }),
      bookMeeting: tool({
        description:
          "Book a meeting/demo. This always requires approval from the sales team.",
        parameters: z.object({
          date: z.string().describe("Meeting date (YYYY-MM-DD)"),
          time: z.string().describe("Meeting time (e.g., '10:00 AM ET')"),
          duration: z.enum(["30", "60"]).describe("Duration in minutes"),
          meetingType: z
            .enum(["demo", "discovery", "technical_deep_dive", "proposal_review"])
            .describe("Type of meeting"),
          prospectName: z.string().optional(),
          prospectEmail: z.string().optional(),
          notes: z.string().optional(),
        }),
        execute: async ({
          date,
          time,
          duration,
          meetingType,
          prospectName,
          prospectEmail,
          notes,
        }) => {
          // Create pending approval
          await db.insert(pendingApprovals).values({
            companyId,
            conversationId,
            toolName: "bookMeeting",
            toolInput: {
              date,
              time,
              duration,
              meetingType,
              prospectName,
              prospectEmail,
              prospectId,
              notes,
            },
            agentType: "scheduler",
            status: "pending",
          });

          return {
            status: "pending_approval",
            message: `I've submitted a ${meetingType} request for ${date} at ${time} (${duration} min). Our team will confirm shortly and send you a calendar invite.`,
          };
        },
      }),
    },
    maxSteps: 3,
  });

  const hasApprovals = result.steps.some((s) =>
    s.toolResults.some(
      (tr: any) => tr?.result?.status === "pending_approval"
    )
  );

  return {
    status: hasApprovals ? ("needs_approval" as const) : ("completed" as const),
    response: result.text,
    toolCalls: result.steps.flatMap((s) => s.toolCalls),
  };
}
