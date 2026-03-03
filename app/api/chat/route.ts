import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  conversations,
  messages as messagesTable,
  prospects,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { classifyIntent, type AgentType } from "@/lib/agents/supervisor";
import { runKnowledgeAgent } from "@/lib/agents/knowledge";
import { runQualifierAgent } from "@/lib/agents/qualifier";
import { runDealAgent } from "@/lib/agents/deal";
import { runSchedulerAgent } from "@/lib/agents/scheduler";
import { runGuardrails } from "@/lib/guardrails";
import { retrieveMemories } from "@/lib/memory/retrieve";
import { inngest } from "@/lib/inngest/client";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

const log = logger.create("api:chat");

// In-memory AbortController registry for cancelling in-flight LLM calls
const activeJobs = new Map<string, AbortController>();

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 20 req/min per IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`chat:${ip}`, 20);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }
    const body = await request.json();
    const {
      messages,
      companyId,
      conversationId: existingConversationId,
      prospectId: existingProspectId,
    } = body;

    if (!messages || !companyId) {
      return NextResponse.json(
        { error: "messages and companyId are required" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];

    // Pre-guardrail check on input
    const inputGuardrail = await runGuardrails(
      lastMessage.content,
      companyId,
      "input"
    );
    if (!inputGuardrail.passed) {
      return NextResponse.json({
        role: "assistant",
        content: inputGuardrail.fallbackResponse,
        violation: inputGuardrail.violation,
      });
    }

    // Get or create conversation
    let conversationId = existingConversationId;
    let prospectId = existingProspectId;
    const jobId = uuidv4();

    if (!conversationId) {
      // Create prospect if needed
      if (!prospectId) {
        const [prospect] = await db
          .insert(prospects)
          .values({
            companyId,
            tags: ["inbound", "chat"],
          })
          .returning();
        prospectId = prospect.id;
      }

      const [conversation] = await db
        .insert(conversations)
        .values({
          companyId,
          prospectId,
          status: "processing",
          activeJobId: jobId,
        })
        .returning();
      conversationId = conversation.id;
    } else {
      // --- Interrupt/Kill/Restart Pattern (Module 2) ---
      // If there's an active job for this conversation, abort it
      const existing = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (existing[0]?.activeJobId) {
        const previousController = activeJobs.get(existing[0].activeJobId);
        if (previousController) {
          previousController.abort();
          activeJobs.delete(existing[0].activeJobId);
        }
        // Mark previous job as cancelled
        await db
          .update(conversations)
          .set({ status: "cancelled" })
          .where(eq(conversations.id, conversationId));
      }

      // Restart with new job ID and updated context
      await db
        .update(conversations)
        .set({ status: "processing", activeJobId: jobId })
        .where(eq(conversations.id, conversationId));
    }

    // Register AbortController for this job
    const abortController = new AbortController();
    activeJobs.set(jobId, abortController);

    try {
      // Store user message
      const existingMessages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(desc(messagesTable.orderIndex))
        .limit(1);

      const nextIndex =
        existingMessages.length > 0
          ? existingMessages[0].orderIndex + 1
          : 0;

      await db.insert(messagesTable).values({
        conversationId,
        role: "user",
        content: lastMessage.content,
        orderIndex: nextIndex,
      });

      // Check if aborted before LLM calls
      if (abortController.signal.aborted) {
        return NextResponse.json({ status: "cancelled" });
      }

      // Retrieve prospect memories for context
      let prospectContext = "";
      if (prospectId) {
        prospectContext = await retrieveMemories(
          prospectId,
          lastMessage.content
        );
      }

      // Classify intent with supervisor
      const { intent, agent: agentType } = await classifyIntent(
        messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        }))
      );

      if (abortController.signal.aborted) {
        return NextResponse.json({ status: "cancelled" });
      }

      // Route to the appropriate agent
      const agentMessages = messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      );

      let agentResult: { status: string; response: string; toolCalls?: any[] } = await runAgent(agentType, {
        messages: agentMessages,
        companyId,
        conversationId,
        prospectId,
        prospectContext,
      });

      // --- Conditional Re-routing (Module 5) ---
      // If qualifier scored a "hot" lead and detected pricing intent, re-route to deal agent
      if (agentType === "qualifier" && agentResult.status === "completed") {
        const responseText = agentResult.response.toLowerCase();
        const hasPricingSignal =
          responseText.includes("pricing") ||
          responseText.includes("proposal") ||
          responseText.includes("book a demo");

        // Check if any tool call scored the lead as "hot"
        const hasHotLead = agentResult.toolCalls?.some(
          (tc: any) =>
            tc.toolName === "scoreLeadFit" &&
            tc.args &&
            (tc.args as any).budget === "enterprise"
        );

        if (hasHotLead && hasPricingSignal) {
          // Re-route: run deal agent as follow-up
          const dealResult = await runAgent("deal", {
            messages: agentMessages,
            companyId,
            conversationId,
            prospectId,
            prospectContext,
          });
          // Append deal agent's context to the response
          agentResult = {
            ...agentResult,
            response:
              agentResult.response + "\n\n" + dealResult.response,
            status: dealResult.status,
          };
        }
      }

      if (abortController.signal.aborted) {
        return NextResponse.json({ status: "cancelled" });
      }

      // Post-guardrail check on output
      const outputGuardrail = await runGuardrails(
        agentResult.response,
        companyId,
        "output"
      );

      const finalResponse = outputGuardrail.passed
        ? agentResult.response
        : outputGuardrail.fallbackResponse!;

      // Store assistant message
      await db.insert(messagesTable).values({
        conversationId,
        role: "assistant",
        content: finalResponse,
        agentType,
        orderIndex: nextIndex + 1,
      });

      // Update conversation status
      await db
        .update(conversations)
        .set({ status: "idle", activeJobId: null })
        .where(eq(conversations.id, conversationId));

      // --- Emit completion event for memory extraction (Module 4) ---
      if (prospectId) {
        await inngest
          .send({
            name: "conversation/completed",
            data: { conversationId, prospectId },
          })
          .catch(() => {
            // Inngest may not be running in dev - fail silently
          });
      }

      return NextResponse.json({
        role: "assistant",
        content: finalResponse,
        conversationId,
        prospectId,
        agentType,
        intent: intent.intent,
        confidence: intent.confidence,
        status: agentResult.status,
      });
    } finally {
      // Cleanup AbortController
      activeJobs.delete(jobId);
    }
  } catch (error) {
    log.error("Chat API error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Centralized agent runner for clean routing and re-routing
async function runAgent(
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
