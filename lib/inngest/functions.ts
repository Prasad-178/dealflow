import { inngest } from "./client";
import { db } from "@/lib/db";
import { messageQueue, conversations, messages, prospects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { extractFacts } from "@/lib/memory/extract";
import { consolidateMemories } from "@/lib/memory/consolidate";

// Process webhook messages from the queue
export const processWebhookMessage = inngest.createFunction(
  { id: "process-webhook-message", name: "Process Webhook Message" },
  { event: "webhook/message.received" },
  async ({ event, step }) => {
    const { messageQueueId } = event.data;

    // Mark as processing
    await step.run("mark-processing", async () => {
      await db
        .update(messageQueue)
        .set({ status: "processing" })
        .where(eq(messageQueue.id, messageQueueId));
    });

    // Get the queue item
    const queueItem = await step.run("get-queue-item", async () => {
      const items = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.id, messageQueueId))
        .limit(1);
      return items[0];
    });

    if (!queueItem) {
      throw new Error("Queue item not found");
    }

    // Process through agent pipeline
    await step.run("process-message", async () => {
      // In production, this would invoke the supervisor agent
      // For now, mark as completed
      await db
        .update(messageQueue)
        .set({
          status: "completed",
          processedAt: new Date(),
        })
        .where(eq(messageQueue.id, messageQueueId));
    });

    return { success: true };
  }
);

// Extract and store memories after conversation
export const extractMemories = inngest.createFunction(
  { id: "extract-memories", name: "Extract Memories" },
  { event: "conversation/completed" },
  async ({ event, step }) => {
    const { conversationId, prospectId } = event.data;

    // Get conversation messages
    const conversationMessages = await step.run("get-messages", async () => {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.orderIndex);
    });

    if (conversationMessages.length === 0) return { facts: [] };

    // Extract facts
    const facts = await step.run("extract-facts", async () => {
      const msgs = conversationMessages
        .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content! }));

      return await extractFacts(msgs, prospectId, conversationId);
    });

    // Consolidate with existing memories
    await step.run("consolidate", async () => {
      await consolidateMemories(prospectId, facts);
    });

    return { facts: facts.length };
  }
);
