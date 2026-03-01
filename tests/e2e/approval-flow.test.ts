import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  companies,
  prospects,
  conversations,
  pendingApprovals,
  meetings,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Approval Flow E2E", () => {
  let companyId: string;
  let prospectId: string;
  let conversationId: string;

  beforeAll(async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "Approval Test Co", industry: "Test" })
      .returning();
    companyId = company.id;

    const [prospect] = await db
      .insert(prospects)
      .values({
        companyId,
        name: "Approval Prospect",
        email: "approval@test.com",
      })
      .returning();
    prospectId = prospect.id;

    const [conv] = await db
      .insert(conversations)
      .values({ companyId, prospectId, status: "idle" })
      .returning();
    conversationId = conv.id;
  });

  afterAll(async () => {
    await db.delete(meetings).where(eq(meetings.companyId, companyId));
    await db.delete(pendingApprovals).where(eq(pendingApprovals.conversationId, conversationId));
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    await db.delete(prospects).where(eq(prospects.id, prospectId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  it("creates a discount approval that gets denied", async () => {
    const [approval] = await db
      .insert(pendingApprovals)
      .values({
        companyId,
        conversationId,
        toolName: "applyDiscount",
        toolInput: { discountPercent: 30, reason: "Competitor pricing", tier: "Enterprise" },
        agentType: "deal",
        status: "pending",
      })
      .returning();

    // Deny it
    const [denied] = await db
      .update(pendingApprovals)
      .set({
        status: "denied",
        reviewerNote: "Discount too high, max is 20%",
        reviewedBy: "vp-sales",
      })
      .where(eq(pendingApprovals.id, approval.id))
      .returning();

    expect(denied.status).toBe("denied");
    expect(denied.reviewerNote).toContain("too high");
  });

  it("creates a meeting approval that gets approved", async () => {
    const [approval] = await db
      .insert(pendingApprovals)
      .values({
        companyId,
        conversationId,
        toolName: "bookMeeting",
        toolInput: {
          date: "2026-03-10",
          time: "2:00 PM ET",
          duration: "30",
          meetingType: "demo",
          prospectName: "Approval Prospect",
          prospectEmail: "approval@test.com",
          prospectId,
        },
        agentType: "scheduler",
        status: "pending",
      })
      .returning();

    expect(approval.status).toBe("pending");

    // Approve it
    const [approved] = await db
      .update(pendingApprovals)
      .set({ status: "approved", reviewedBy: "account-exec" })
      .where(eq(pendingApprovals.id, approval.id))
      .returning();

    expect(approved.status).toBe("approved");
  });

  it("tracks multiple approvals per conversation", async () => {
    const all = await db
      .select()
      .from(pendingApprovals)
      .where(eq(pendingApprovals.conversationId, conversationId));

    expect(all.length).toBe(2);
    const statuses = all.map((a) => a.status);
    expect(statuses).toContain("denied");
    expect(statuses).toContain("approved");
  });
});
