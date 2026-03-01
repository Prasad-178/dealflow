import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  companies,
  prospects,
  conversations,
  messages,
  embeddings,
  pendingApprovals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// This test runs a simulated chat flow through the database layer
// It verifies the full lifecycle: company -> prospect -> conversation -> messages -> approvals

describe("Chat Flow E2E", () => {
  let companyId: string;
  let prospectId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Setup: create a test company with product data
    const [company] = await db
      .insert(companies)
      .values({
        name: "E2E Test Company",
        description: "Company for e2e tests",
        industry: "Technology",
        products: [
          {
            id: "test_prod",
            name: "TestProduct",
            description: "A test product",
            features: ["Feature A", "Feature B"],
            pricingTiers: [
              {
                name: "Starter",
                price: 49,
                billingCycle: "monthly" as const,
                features: ["Basic feature"],
              },
              {
                name: "Pro",
                price: 149,
                billingCycle: "monthly" as const,
                features: ["All features"],
              },
            ],
          },
        ],
        guardrailConfig: {
          blockedTopics: ["internal info"],
          maxDiscountPercent: 25,
          requireApprovalForProposals: true,
          requireApprovalForMeetings: true,
        },
      })
      .returning();
    companyId = company.id;
  });

  afterAll(async () => {
    // Cleanup in dependency order
    if (conversationId) {
      await db.delete(messages).where(eq(messages.conversationId, conversationId));
      await db.delete(pendingApprovals).where(eq(pendingApprovals.conversationId, conversationId));
      await db.delete(conversations).where(eq(conversations.id, conversationId));
    }
    if (prospectId) {
      await db.delete(prospects).where(eq(prospects.id, prospectId));
    }
    if (companyId) {
      await db.delete(embeddings).where(eq(embeddings.companyId, companyId));
      await db.delete(companies).where(eq(companies.id, companyId));
    }
  });

  it("step 1: creates an inbound prospect", async () => {
    const [prospect] = await db
      .insert(prospects)
      .values({
        companyId,
        name: "E2E Prospect",
        email: "e2e@test.com",
        company: "E2E Corp",
        role: "VP Sales",
        tags: ["inbound", "chat"],
      })
      .returning();

    prospectId = prospect.id;
    expect(prospect.name).toBe("E2E Prospect");
    expect(prospect.qualificationScore).toBeNull();
  });

  it("step 2: starts a conversation", async () => {
    const [conv] = await db
      .insert(conversations)
      .values({
        companyId,
        prospectId,
        status: "idle",
      })
      .returning();

    conversationId = conv.id;
    expect(conv.status).toBe("idle");
  });

  it("step 3: simulates message exchange", async () => {
    // User message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: "Hi, what does your product do?",
      orderIndex: 0,
    });

    // Agent response
    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: "TestProduct is our AI-powered solution with Feature A and Feature B.",
      agentType: "knowledge",
      orderIndex: 1,
    });

    // Follow-up
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: "How much does the Pro plan cost?",
      orderIndex: 2,
    });

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: "The Pro plan is $149/month and includes all features.",
      agentType: "deal",
      orderIndex: 3,
    });

    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.orderIndex);

    expect(allMessages).toHaveLength(4);
    expect(allMessages[0].role).toBe("user");
    expect(allMessages[1].agentType).toBe("knowledge");
    expect(allMessages[3].agentType).toBe("deal");
  });

  it("step 4: creates HITL approval for proposal", async () => {
    const [approval] = await db
      .insert(pendingApprovals)
      .values({
        companyId,
        conversationId,
        toolName: "sendProposal",
        toolInput: {
          prospectName: "E2E Prospect",
          selectedTier: "Pro",
          discountPercent: 15,
        },
        agentType: "deal",
        status: "pending",
      })
      .returning();

    expect(approval.status).toBe("pending");
    expect(approval.toolName).toBe("sendProposal");
  });

  it("step 5: approves the proposal", async () => {
    const pendingList = await db
      .select()
      .from(pendingApprovals)
      .where(eq(pendingApprovals.conversationId, conversationId));

    expect(pendingList.length).toBeGreaterThan(0);

    const [approved] = await db
      .update(pendingApprovals)
      .set({
        status: "approved",
        reviewedBy: "sales-manager",
        reviewedAt: new Date(),
      })
      .where(eq(pendingApprovals.id, pendingList[0].id))
      .returning();

    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe("sales-manager");
  });

  it("step 6: updates prospect qualification score", async () => {
    await db
      .update(prospects)
      .set({ qualificationScore: 85 })
      .where(eq(prospects.id, prospectId));

    const [updated] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId));

    expect(updated.qualificationScore).toBe(85);
  });

  it("step 7: verifies conversation can be set to idle", async () => {
    await db
      .update(conversations)
      .set({ status: "idle", activeJobId: null })
      .where(eq(conversations.id, conversationId));

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    expect(conv.status).toBe("idle");
    expect(conv.activeJobId).toBeNull();
  });
});
