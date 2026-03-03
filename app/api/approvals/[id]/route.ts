import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pendingApprovals, meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createCalendarEvent } from "@/lib/integrations/calendar";
import { sendMeetingConfirmation } from "@/lib/integrations/email";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const approval = await db
    .select()
    .from(pendingApprovals)
    .where(eq(pendingApprovals.id, id))
    .limit(1);

  if (!approval[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(approval[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, reviewerNote, reviewedBy } = body;

  if (!["approved", "denied"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be 'approved' or 'denied'" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(pendingApprovals)
    .set({
      status,
      reviewerNote,
      reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(pendingApprovals.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If approved and it's a meeting booking, create the meeting + calendar event
  if (status === "approved" && updated.toolName === "bookMeeting") {
    const input = updated.toolInput as Record<string, any>;
    const startTime = new Date(`${input.date} ${input.time}`);
    const endTime = new Date(
      startTime.getTime() + parseInt(input.duration || "30") * 60000
    );
    const title = `${input.meetingType} - ${input.prospectName || "Prospect"}`;

    // Try to create Google Calendar event with Meet link (best-effort)
    let meetingLink: string | undefined;
    let htmlLink: string | undefined;
    try {
      const calendarResult = await createCalendarEvent({
        title,
        startTime,
        endTime,
        attendeeEmails: [input.prospectEmail].filter(Boolean),
      });
      if (calendarResult) {
        meetingLink = calendarResult.meetLink;
        htmlLink = calendarResult.htmlLink;
      }
    } catch (error) {
      console.error("[approvals] Calendar event creation failed:", error);
    }

    // Insert meeting record
    await db.insert(meetings).values({
      companyId: updated.companyId,
      prospectId: input.prospectId || "00000000-0000-0000-0000-000000000000",
      conversationId: updated.conversationId,
      title,
      description: input.notes,
      startTime,
      endTime,
      attendees: [input.prospectEmail].filter(Boolean),
      meetingLink: meetingLink || undefined,
      status: "scheduled",
    });

    // Send email confirmation to prospect (best-effort)
    if (input.prospectEmail) {
      try {
        await sendMeetingConfirmation({
          toEmail: input.prospectEmail,
          title,
          startTime,
          endTime,
          meetingLink,
        });
      } catch (error) {
        console.error("[approvals] Meeting confirmation email failed:", error);
      }
    }

    return NextResponse.json({
      ...updated,
      meetingLink,
      htmlLink,
      calendarEventCreated: !!meetingLink,
    });
  }

  return NextResponse.json(updated);
}
