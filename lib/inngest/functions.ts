import { inngest } from "./client";
import { db } from "@/lib/db";
import {
  messageQueue,
  conversations,
  messages,
  prospects,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { extractFacts } from "@/lib/memory/extract";
import { consolidateMemories } from "@/lib/memory/consolidate";
import { retrieveMemories } from "@/lib/memory/retrieve";
import { classifyIntent } from "@/lib/agents/supervisor";
import { runKnowledgeAgent } from "@/lib/agents/knowledge";
import { runQualifierAgent } from "@/lib/agents/qualifier";
import { runDealAgent } from "@/lib/agents/deal";
import { runSchedulerAgent } from "@/lib/agents/scheduler";
import { runGuardrails } from "@/lib/guardrails";
import { parseEmailPayload } from "@/lib/integrations/email";
import { parseSlackPayload } from "@/lib/integrations/slack";
import { parseTelegramPayload } from "@/lib/integrations/telegram";
import { sendOutboundMessage } from "@/lib/integrations/outbound";
import type { NormalizedMessage, Platform } from "@/lib/integrations/types";
import type { AgentType } from "@/lib/agents/supervisor";
import { v4 as uuidv4 } from "uuid";
import { logger } from "@/lib/logger";

const log = logger.create("inngest");

function parsePayload(
  platform: string,
  payload: Record<string, unknown>
): NormalizedMessage | null {
  switch (platform) {
    case "email":
      return parseEmailPayload(payload);
    case "slack":
      return parseSlackPayload(payload);
    case "telegram":
      return parseTelegramPayload(payload);
    case "widget":
    case "api":
      // Widget/API payloads have a simple { text, senderEmail? } shape
      return {
        platform: platform as Platform,
        text: (payload.text as string) || (payload.message as string) || "",
        senderEmail: payload.senderEmail as string | undefined,
        senderName: payload.senderName as string | undefined,
        replyTo: { type: platform as "widget" | "api" },
      };
    default:
      return null;
  }
}

// Centralized agent runner (mirrors app/api/chat/route.ts)
function runAgent(
  agentType: AgentType,
  params: {
    messages: { role: "user" | "assistant"; content: string }[];
    companyId: string;
    conversationId: string;
    prospectId?: string;
    prospectContext?: string;
  }
) {
  switch (agentType) {
    case "knowledge":
      return runKnowledgeAgent({
        messages: params.messages,
        companyId: params.companyId,
        prospectContext: params.prospectContext,
      });
    case "qualifier":
      return runQualifierAgent({
        messages: params.messages,
        companyId: params.companyId,
        prospectId: params.prospectId,
        prospectContext: params.prospectContext,
      });
    case "deal":
      return runDealAgent({
        messages: params.messages,
        companyId: params.companyId,
        conversationId: params.conversationId,
        prospectContext: params.prospectContext,
      });
    case "scheduler":
      return runSchedulerAgent({
        messages: params.messages,
        companyId: params.companyId,
        conversationId: params.conversationId,
        prospectId: params.prospectId,
        prospectContext: params.prospectContext,
      });
    default:
      return runKnowledgeAgent({
        messages: params.messages,
        companyId: params.companyId,
        prospectContext: params.prospectContext,
      });
  }
}

// Process webhook messages from the queue — full agent pipeline
export const processWebhookMessage = inngest.createFunction(
  { id: "process-webhook-message", name: "Process Webhook Message" },
  { event: "webhook/message.received" },
  async ({ event, step }) => {
    const { messageQueueId, platform } = event.data;
    log.info("Processing webhook message", { messageQueueId, platform });

    // Step 1: Mark as processing
    await step.run("mark-processing", async () => {
      await db
        .update(messageQueue)
        .set({ status: "processing" })
        .where(eq(messageQueue.id, messageQueueId));
    });

    // Step 2: Fetch queue item
    const queueItem = await step.run("get-queue-item", async () => {
      const items = await db
        .select()
        .from(messageQueue)
        .where(eq(messageQueue.id, messageQueueId))
        .limit(1);
      return items[0];
    });

    if (!queueItem) {
      log.error("Queue item not found", { messageQueueId });
      throw new Error("Queue item not found");
    }

    // Step 3: Parse payload into NormalizedMessage
    const normalized = await step.run("parse-payload", async () => {
      return parsePayload(platform, queueItem.payload);
    });

    if (!normalized || !normalized.text) {
      await step.run("mark-completed-no-content", async () => {
        await db
          .update(messageQueue)
          .set({ status: "completed", processedAt: new Date() })
          .where(eq(messageQueue.id, messageQueueId));
      });
      log.warn("No parseable content, skipping", { messageQueueId, platform });
      return { success: true, skipped: true, reason: "No parseable content" };
    }

    // Step 4: Resolve companyId
    const companyId = await step.run("resolve-company", async () => {
      return process.env.DEFAULT_COMPANY_ID || "00000000-0000-0000-0000-000000000000";
    });

    // Step 5: Get or create prospect
    const prospectId = await step.run("get-or-create-prospect", async () => {
      // Try to find existing prospect by email
      if (normalized.senderEmail) {
        const existing = await db
          .select()
          .from(prospects)
          .where(eq(prospects.email, normalized.senderEmail))
          .limit(1);
        if (existing[0]) return existing[0].id;
      }

      const [prospect] = await db
        .insert(prospects)
        .values({
          companyId,
          name: normalized.senderName || undefined,
          email: normalized.senderEmail || undefined,
          tags: ["inbound", normalized.platform],
        })
        .returning();
      return prospect.id;
    });

    // Step 6: Get or create conversation
    const conversationId = await step.run("get-or-create-conversation", async () => {
      const [conversation] = await db
        .insert(conversations)
        .values({
          companyId,
          prospectId,
          status: "processing",
          activeJobId: uuidv4(),
        })
        .returning();
      return conversation.id;
    });

    // Step 7: Load history + store user message
    const historyMessages = await step.run("store-user-message", async () => {
      const existing = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.orderIndex))
        .limit(1);

      const nextIndex = existing.length > 0 ? existing[0].orderIndex + 1 : 0;

      await db.insert(messages).values({
        conversationId,
        role: "user",
        content: normalized.text,
        orderIndex: nextIndex,
      });

      // Return conversation history for agent context
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.orderIndex);

      return allMessages
        .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content!,
        }));
    });

    // Step 8: Input guardrails
    const inputCheck = await step.run("input-guardrails", async () => {
      return runGuardrails(normalized.text, companyId, "input");
    });

    if (!inputCheck.passed) {
      log.warn("Input guardrail blocked message", { messageQueueId, violation: inputCheck.violation });
      const fallbackText = inputCheck.fallbackResponse || "I can help you with that. Could you rephrase?";

      await step.run("send-fallback", async () => {
        await sendOutboundMessage({
          platform: normalized.platform,
          text: fallbackText,
          replyTo: normalized.replyTo,
        });
      });

      await step.run("mark-completed-guardrail", async () => {
        await db
          .update(messageQueue)
          .set({ status: "completed", processedAt: new Date() })
          .where(eq(messageQueue.id, messageQueueId));
        await db
          .update(conversations)
          .set({ status: "idle", activeJobId: null })
          .where(eq(conversations.id, conversationId));
      });

      return { success: true, guardrailBlocked: true };
    }

    // Step 9: Retrieve memories
    const prospectContext = await step.run("retrieve-memories", async () => {
      return retrieveMemories(prospectId, normalized.text);
    });

    // Step 10: Classify intent
    const classification = await step.run("classify-intent", async () => {
      return classifyIntent(historyMessages);
    });

    log.info("Intent classified", { agent: classification.agent, intent: classification.intent.intent });

    // Step 11: Run agent
    const agentResult = await step.run("run-agent", async () => {
      return runAgent(classification.agent, {
        messages: historyMessages,
        companyId,
        conversationId,
        prospectId,
        prospectContext,
      });
    });

    // Step 12: Output guardrails
    const outputCheck = await step.run("output-guardrails", async () => {
      return runGuardrails(agentResult.response, companyId, "output");
    });

    if (!outputCheck.passed) {
      log.warn("Output guardrail blocked response", { messageQueueId, violation: outputCheck.violation });
    }

    const finalResponse = outputCheck.passed
      ? agentResult.response
      : outputCheck.fallbackResponse || "I'd be happy to help you with that. Could you tell me more?";

    // Step 13: Store assistant reply
    await step.run("store-assistant-reply", async () => {
      const existing = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.orderIndex))
        .limit(1);

      const nextIndex = existing.length > 0 ? existing[0].orderIndex + 1 : 0;

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: finalResponse,
        agentType: classification.agent,
        orderIndex: nextIndex,
      });
    });

    // Step 14: Send outbound message
    await step.run("send-outbound", async () => {
      await sendOutboundMessage({
        platform: normalized.platform,
        text: finalResponse,
        replyTo: normalized.replyTo,
      });
    });

    // Step 15: Mark completed
    await step.run("mark-completed", async () => {
      await db
        .update(messageQueue)
        .set({ status: "completed", processedAt: new Date() })
        .where(eq(messageQueue.id, messageQueueId));
      await db
        .update(conversations)
        .set({ status: "idle", activeJobId: null })
        .where(eq(conversations.id, conversationId));
    });

    // Step 16: Emit memory extraction event
    await step.run("emit-memory-extraction", async () => {
      await inngest
        .send({
          name: "conversation/completed",
          data: { conversationId, prospectId },
        })
        .catch(() => {
          // Fail silently if Inngest is unavailable
        });
    });

    log.info("Webhook message processed", {
      conversationId,
      prospectId,
      agentType: classification.agent,
      intent: classification.intent.intent,
    });

    return {
      success: true,
      conversationId,
      prospectId,
      agentType: classification.agent,
      intent: classification.intent.intent,
    };
  }
);

// Extract and store memories after conversation
export const extractMemories = inngest.createFunction(
  { id: "extract-memories", name: "Extract Memories" },
  { event: "conversation/completed" },
  async ({ event, step }) => {
    const { conversationId, prospectId } = event.data;
    log.info("Extracting memories", { conversationId, prospectId });

    // Get conversation messages
    const conversationMessages = await step.run("get-messages", async () => {
      return await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.orderIndex);
    });

    if (conversationMessages.length === 0) {
      log.info("No messages to extract from", { conversationId });
      return { facts: [] };
    }

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

    log.info("Memory extraction complete", { conversationId, factsCount: facts.length });

    return { facts: facts.length };
  }
);
