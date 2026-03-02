import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  companies,
  prospects,
  conversations,
  messages,
  messageQueue,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * E2E test for the webhook → queue → pipeline flow.
 * Tests the database layer of the webhook pipeline without invoking
 * actual LLM calls or external APIs.
 */
describe("Webhook Pipeline E2E", () => {
  let companyId: string;

  beforeAll(async () => {
    const [company] = await db
      .insert(companies)
      .values({ name: "Webhook Test Co", industry: "Test" })
      .returning();
    companyId = company.id;
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.companyId, companyId));

    for (const conv of convs) {
      await db.delete(messages).where(eq(messages.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.companyId, companyId));
    await db.delete(prospects).where(eq(prospects.companyId, companyId));
    await db.delete(companies).where(eq(companies.id, companyId));
  });

  it("step 1: queues an email webhook payload", async () => {
    const [item] = await db
      .insert(messageQueue)
      .values({
        platform: "email",
        payload: {
          from: "Jane Doe <jane@acme.com>",
          subject: "Enterprise pricing",
          text: "Hi, I'd like to learn about your enterprise plan.",
        },
        status: "pending",
      })
      .returning();

    expect(item.platform).toBe("email");
    expect(item.status).toBe("pending");
    expect(item.payload).toHaveProperty("from");

    // Clean up
    await db.delete(messageQueue).where(eq(messageQueue.id, item.id));
  });

  it("step 2: queues a slack webhook payload", async () => {
    const [item] = await db
      .insert(messageQueue)
      .values({
        platform: "slack",
        payload: {
          type: "event_callback",
          event: {
            type: "message",
            text: "Can you help with pricing?",
            channel: "C01CHANNEL",
            user: "U01USER",
            ts: "1234567890.123456",
          },
        },
        status: "pending",
      })
      .returning();

    expect(item.platform).toBe("slack");
    expect(item.status).toBe("pending");

    await db.delete(messageQueue).where(eq(messageQueue.id, item.id));
  });

  it("step 3: queues a telegram webhook payload", async () => {
    const [item] = await db
      .insert(messageQueue)
      .values({
        platform: "telegram",
        payload: {
          update_id: 123456789,
          message: {
            message_id: 1,
            from: { id: 12345, is_bot: false, first_name: "Bob" },
            chat: { id: 67890, type: "private" },
            date: 1234567890,
            text: "What does your product do?",
          },
        },
        status: "pending",
      })
      .returning();

    expect(item.platform).toBe("telegram");
    expect(item.status).toBe("pending");

    await db.delete(messageQueue).where(eq(messageQueue.id, item.id));
  });

  it("step 4: transitions queue item through processing lifecycle", async () => {
    const [item] = await db
      .insert(messageQueue)
      .values({
        platform: "email",
        payload: { from: "test@test.com", text: "Test message" },
        status: "pending",
      })
      .returning();

    // Mark processing
    const [processing] = await db
      .update(messageQueue)
      .set({ status: "processing" })
      .where(eq(messageQueue.id, item.id))
      .returning();
    expect(processing.status).toBe("processing");

    // Mark completed
    const [completed] = await db
      .update(messageQueue)
      .set({ status: "completed", processedAt: new Date() })
      .where(eq(messageQueue.id, item.id))
      .returning();
    expect(completed.status).toBe("completed");
    expect(completed.processedAt).not.toBeNull();

    await db.delete(messageQueue).where(eq(messageQueue.id, item.id));
  });

  it("step 5: creates prospect and conversation from webhook data", async () => {
    // Simulate what the Inngest pipeline does
    const [prospect] = await db
      .insert(prospects)
      .values({
        companyId,
        name: "Webhook Prospect",
        email: "webhook@acme.com",
        tags: ["inbound", "email"],
      })
      .returning();

    const [conv] = await db
      .insert(conversations)
      .values({
        companyId,
        prospectId: prospect.id,
        status: "processing",
      })
      .returning();

    expect(prospect.tags).toContain("email");
    expect(conv.status).toBe("processing");

    // Store messages
    await db.insert(messages).values({
      conversationId: conv.id,
      role: "user",
      content: "Hi, I'd like to learn about enterprise pricing.",
      orderIndex: 0,
    });

    await db.insert(messages).values({
      conversationId: conv.id,
      role: "assistant",
      content: "Our Enterprise plan is $499/month with unlimited leads.",
      agentType: "deal",
      orderIndex: 1,
    });

    const allMsgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(messages.orderIndex);

    expect(allMsgs).toHaveLength(2);
    expect(allMsgs[0].role).toBe("user");
    expect(allMsgs[1].agentType).toBe("deal");

    // Mark idle after pipeline completes
    await db
      .update(conversations)
      .set({ status: "idle", activeJobId: null })
      .where(eq(conversations.id, conv.id));

    const [finished] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conv.id));
    expect(finished.status).toBe("idle");
  });

  it("step 6: handles failed queue items", async () => {
    const [item] = await db
      .insert(messageQueue)
      .values({
        platform: "email",
        payload: { from: "bad@test.com", text: "" },
        status: "pending",
      })
      .returning();

    const [failed] = await db
      .update(messageQueue)
      .set({ status: "failed", error: "Empty message content" })
      .where(eq(messageQueue.id, item.id))
      .returning();

    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("Empty message content");

    await db.delete(messageQueue).where(eq(messageQueue.id, item.id));
  });
});
