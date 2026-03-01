import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pendingApprovals, meetings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // If approved and it's a meeting booking, create the meeting
  if (status === "approved" && updated.toolName === "bookMeeting") {
    const input = updated.toolInput as Record<string, any>;
    await db.insert(meetings).values({
      companyId: updated.companyId,
      prospectId: input.prospectId || "00000000-0000-0000-0000-000000000000",
      conversationId: updated.conversationId,
      title: `${input.meetingType} - ${input.prospectName || "Prospect"}`,
      description: input.notes,
      startTime: new Date(`${input.date} ${input.time}`),
      endTime: new Date(
        new Date(`${input.date} ${input.time}`).getTime() +
          parseInt(input.duration || "30") * 60000
      ),
      attendees: [input.prospectEmail].filter(Boolean),
      status: "scheduled",
    });
  }

  return NextResponse.json(updated);
}
