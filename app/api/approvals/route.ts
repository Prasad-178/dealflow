import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pendingApprovals, conversations, prospects } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "pending", "approved", "denied", or null for all

  const conditions = [eq(pendingApprovals.companyId, companyId)];
  if (status && ["pending", "approved", "denied"].includes(status)) {
    conditions.push(eq(pendingApprovals.status, status as "pending" | "approved" | "denied"));
  }

  const where =
    conditions.length > 1
      ? and(...conditions)
      : conditions[0];

  const results = await db
    .select({
      id: pendingApprovals.id,
      toolName: pendingApprovals.toolName,
      toolInput: pendingApprovals.toolInput,
      agentType: pendingApprovals.agentType,
      status: pendingApprovals.status,
      reviewerNote: pendingApprovals.reviewerNote,
      reviewedAt: pendingApprovals.reviewedAt,
      createdAt: pendingApprovals.createdAt,
      conversationId: pendingApprovals.conversationId,
      prospectName: prospects.name,
      prospectCompany: prospects.company,
    })
    .from(pendingApprovals)
    .leftJoin(conversations, eq(pendingApprovals.conversationId, conversations.id))
    .leftJoin(prospects, eq(conversations.prospectId, prospects.id))
    .where(where)
    .orderBy(desc(pendingApprovals.createdAt));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingApprovals)
    .where(and(eq(pendingApprovals.companyId, companyId), eq(pendingApprovals.status, "pending")));

  return NextResponse.json({
    approvals: results,
    pendingCount: countResult.count,
  });
}
