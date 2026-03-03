import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  prospects,
  pendingApprovals,
  meetings,
  conversations,
  messages,
} from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;

  const [leadCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospects)
    .where(eq(prospects.companyId, companyId));

  const [avgScore] = await db
    .select({
      avg: sql<number>`coalesce(round(avg(${prospects.qualificationScore})), 0)::int`,
    })
    .from(prospects)
    .where(eq(prospects.companyId, companyId));

  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingApprovals)
    .where(
      and(
        eq(pendingApprovals.companyId, companyId),
        eq(pendingApprovals.status, "pending")
      )
    );

  const [meetingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(meetings)
    .where(eq(meetings.companyId, companyId));

  // Recent conversations with last message
  const recentConvos = await db
    .select({
      conversationId: conversations.id,
      prospectId: conversations.prospectId,
      prospectName: prospects.name,
      prospectCompany: prospects.company,
      prospectScore: prospects.qualificationScore,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .leftJoin(prospects, eq(conversations.prospectId, prospects.id))
    .where(eq(conversations.companyId, companyId))
    .orderBy(desc(conversations.updatedAt))
    .limit(5);

  // Get last message for each recent conversation
  const recentWithMessages = await Promise.all(
    recentConvos.map(async (conv) => {
      const [lastMsg] = await db
        .select({
          content: messages.content,
          agentType: messages.agentType,
          role: messages.role,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.conversationId))
        .orderBy(desc(messages.orderIndex))
        .limit(1);

      return {
        ...conv,
        lastMessage: lastMsg?.content || "",
        agentType: lastMsg?.agentType || "knowledge",
      };
    })
  );

  return NextResponse.json({
    leads: leadCount.count,
    avgQualificationScore: avgScore.avg,
    pendingApprovals: pendingCount.count,
    meetings: meetingCount.count,
    recentConversations: recentWithMessages,
  });
}
