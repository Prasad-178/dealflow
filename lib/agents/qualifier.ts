import { generateText, tool } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// --- Extracted pure logic for testability ---

const BANT_SCORES: Record<string, number> = {
  enterprise: 30, mid_market: 20, smb: 10, unknown: 5,
  decision_maker: 25, influencer: 15, user: 10,
  critical: 25, nice_to_have: 15, exploring: 5,
  immediate: 20, this_quarter: 15, this_year: 10, no_timeline: 5,
};

export function calculateLeadScore(budget: string, authority: string, need: string, timeline: string): number {
  return (
    (BANT_SCORES[budget] || 5) +
    (BANT_SCORES[authority] || 5) +
    (BANT_SCORES[need] || 5) +
    (BANT_SCORES[timeline] || 5)
  );
}

export function getTier(score: number): "hot" | "warm" | "cool" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  if (score >= 30) return "cool";
  return "cold";
}

export function getRecommendation(tier: string): string {
  if (tier === "hot") return "High-value lead! Suggest booking a demo immediately.";
  if (tier === "warm") return "Good potential. Continue nurturing and address any concerns.";
  return "Early stage. Provide value and educational content.";
}

export function deduplicateTags(existingTags: string[], newTags: string[]): string[] {
  return [...new Set([...existingTags, ...newTags])];
}

export async function runQualifierAgent({
  messages,
  companyId,
  prospectId,
  prospectContext,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  companyId: string;
  prospectId?: string;
  prospectContext?: string;
}) {
  const result = await generateText({
    model: agentModel,
    system: `You are a friendly, consultative sales qualification specialist.
Your job is to understand the prospect's needs and qualify them as a lead.

QUALIFICATION CRITERIA (BANT):
- Budget: What's their budget range?
- Authority: Are they the decision maker?
- Need: What problem are they trying to solve?
- Timeline: When do they need a solution?

APPROACH:
- Ask questions naturally, not like a form
- Don't ask all questions at once - weave them into conversation
- Listen for buying signals
- If they mention specific needs, acknowledge and dig deeper
- Score the lead when you have enough info (at least 2-3 BANT criteria)
- Tag leads with relevant categories
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`,
    messages,
    tools: {
      scoreLeadFit: tool({
        description:
          "Score a lead's fit based on gathered qualification data. Call this when you have enough info to score.",
        parameters: z.object({
          budget: z
            .enum(["enterprise", "mid_market", "smb", "unknown"])
            .describe("Budget tier"),
          authority: z
            .enum(["decision_maker", "influencer", "user", "unknown"])
            .describe("Their role in buying decisions"),
          need: z
            .enum(["critical", "nice_to_have", "exploring", "unknown"])
            .describe("How urgent is their need"),
          timeline: z
            .enum(["immediate", "this_quarter", "this_year", "no_timeline", "unknown"])
            .describe("When they need a solution"),
        }),
        execute: async ({ budget, authority, need, timeline }) => {
          const score = calculateLeadScore(budget, authority, need, timeline);

          if (prospectId) {
            await db
              .update(prospects)
              .set({ qualificationScore: score, updatedAt: new Date() })
              .where(eq(prospects.id, prospectId));
          }

          const tier = getTier(score);

          return {
            score,
            tier,
            recommendation: getRecommendation(tier),
          };
        },
      }),
      getCompanyInfo: tool({
        description: "Look up information about a prospect's company",
        parameters: z.object({
          companyName: z.string().describe("Name of the prospect's company"),
        }),
        execute: async ({ companyName }) => {
          // Simulated company lookup
          return {
            name: companyName,
            estimatedSize: "50-200 employees",
            industry: "Technology",
            note: "Company info retrieved from public data",
          };
        },
      }),
      tagLead: tool({
        description: "Add tags to the lead for CRM categorization",
        parameters: z.object({
          tags: z
            .array(z.string())
            .describe("Tags to add (e.g., 'enterprise', 'urgent', 'technical-buyer')"),
        }),
        execute: async ({ tags }) => {
          if (prospectId) {
            const prospect = await db
              .select()
              .from(prospects)
              .where(eq(prospects.id, prospectId))
              .limit(1);

            const existingTags = (prospect[0]?.tags as string[]) || [];
            const newTags = deduplicateTags(existingTags, tags);

            await db
              .update(prospects)
              .set({ tags: newTags, updatedAt: new Date() })
              .where(eq(prospects.id, prospectId));
          }
          return { tagged: tags };
        },
      }),
    },
    maxSteps: 3,
  });

  return {
    status: "completed" as const,
    response: result.text,
    toolCalls: result.steps.flatMap((s) => s.toolCalls),
  };
}
