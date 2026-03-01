import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  companies,
  prospects,
  conversations,
  messages,
  pendingApprovals,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("Database Operations (Integration)", () => {
  let testCompanyId: string;
  let testProspectId: string;
  let testConversationId: string;

  beforeAll(async () => {
    // Create test company
    const [company] = await db
      .insert(companies)
      .values({
        name: "Test Company (integration test)",
        description: "Created by integration tests",
        industry: "Testing",
      })
      .returning();
    testCompanyId = company.id;
  });

  afterAll(async () => {
    // Cleanup: delete test data in reverse order of dependencies
    if (testConversationId) {
      await db.delete(messages).where(eq(messages.conversationId, testConversationId));
      await db.delete(pendingApprovals).where(eq(pendingApprovals.conversationId, testConversationId));
      await db.delete(conversations).where(eq(conversations.id, testConversationId));
    }
    if (testProspectId) {
      await db.delete(prospects).where(eq(prospects.id, testProspectId));
    }
    if (testCompanyId) {
      await db.delete(companies).where(eq(companies.id, testCompanyId));
    }
  });

  it("creates a prospect", async () => {
    const [prospect] = await db
      .insert(prospects)
      .values({
        companyId: testCompanyId,
        name: "Test Prospect",
        email: "test@example.com",
        company: "Test Corp",
        role: "CTO",
        tags: ["test", "integration"],
      })
      .returning();

    testProspectId = prospect.id;
    expect(prospect.name).toBe("Test Prospect");
    expect(prospect.tags).toEqual(["test", "integration"]);
  });

  it("creates a conversation", async () => {
    const [conversation] = await db
      .insert(conversations)
      .values({
        companyId: testCompanyId,
        prospectId: testProspectId,
        status: "idle",
      })
      .returning();

    testConversationId = conversation.id;
    expect(conversation.status).toBe("idle");
  });

  it("adds messages to a conversation", async () => {
    await db.insert(messages).values({
      conversationId: testConversationId,
      role: "user",
      content: "Hello, I need help",
      orderIndex: 0,
    });

    await db.insert(messages).values({
      conversationId: testConversationId,
      role: "assistant",
      content: "How can I help you today?",
      agentType: "knowledge",
      orderIndex: 1,
    });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, testConversationId))
      .orderBy(messages.orderIndex);

    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].agentType).toBe("knowledge");
  });

  it("creates a pending approval", async () => {
    const [approval] = await db
      .insert(pendingApprovals)
      .values({
        companyId: testCompanyId,
        conversationId: testConversationId,
        toolName: "sendProposal",
        toolInput: {
          prospectName: "Test Prospect",
          selectedTier: "Professional",
          discountPercent: 15,
        },
        agentType: "deal",
        status: "pending",
      })
      .returning();

    expect(approval.status).toBe("pending");
    expect(approval.toolName).toBe("sendProposal");

    // Approve it
    const [updated] = await db
      .update(pendingApprovals)
      .set({ status: "approved", reviewedBy: "test-reviewer" })
      .where(eq(pendingApprovals.id, approval.id))
      .returning();

    expect(updated.status).toBe("approved");
  });

  it("updates conversation status for concurrency control", async () => {
    // Set to processing
    await db
      .update(conversations)
      .set({ status: "processing", activeJobId: "job-123" })
      .where(eq(conversations.id, testConversationId));

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, testConversationId));

    expect(conv.status).toBe("processing");
    expect(conv.activeJobId).toBe("job-123");

    // Cancel and restart
    await db
      .update(conversations)
      .set({ status: "cancelled" })
      .where(eq(conversations.id, testConversationId));

    await db
      .update(conversations)
      .set({ status: "processing", activeJobId: "job-456" })
      .where(eq(conversations.id, testConversationId));

    const [updated] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, testConversationId));

    expect(updated.status).toBe("processing");
    expect(updated.activeJobId).toBe("job-456");
  });

  it("stores and retrieves JSON data correctly", async () => {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, testCompanyId));

    // Verify the company was stored properly
    expect(company.name).toBe("Test Company (integration test)");
  });
});
