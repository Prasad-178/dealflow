import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  conversations,
  messages as messagesTable,
  prospects,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { classifyIntent } from "@/lib/agents/supervisor";
import { runKnowledgeAgent } from "@/lib/agents/knowledge";
import { runQualifierAgent } from "@/lib/agents/qualifier";
import { runDealAgent } from "@/lib/agents/deal";
import { runSchedulerAgent } from "@/lib/agents/scheduler";
import { runGuardrails } from "@/lib/guardrails";
import { retrieveMemories } from "@/lib/memory/retrieve";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
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
          activeJobId: uuidv4(),
        })
        .returning();
      conversationId = conversation.id;
    } else {
      // Update status to processing
      await db
        .update(conversations)
        .set({ status: "processing", activeJobId: uuidv4() })
        .where(eq(conversations.id, conversationId));
    }

    // Store user message
    const existingMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.orderIndex))
      .limit(1);

    const nextIndex = existingMessages.length > 0
      ? existingMessages[0].orderIndex + 1
      : 0;

    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: lastMessage.content,
      orderIndex: nextIndex,
    });

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

    // Route to the appropriate agent
    const agentMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    let agentResult;

    switch (agentType) {
      case "knowledge":
        agentResult = await runKnowledgeAgent({
          messages: agentMessages,
          companyId,
          prospectContext,
        });
        break;

      case "qualifier":
        agentResult = await runQualifierAgent({
          messages: agentMessages,
          companyId,
          prospectId,
          prospectContext,
        });
        break;

      case "deal":
        agentResult = await runDealAgent({
          messages: agentMessages,
          companyId,
          conversationId,
          prospectContext,
        });
        break;

      case "scheduler":
        agentResult = await runSchedulerAgent({
          messages: agentMessages,
          companyId,
          conversationId,
          prospectId,
          prospectContext,
        });
        break;

      default:
        agentResult = await runKnowledgeAgent({
          messages: agentMessages,
          companyId,
          prospectContext,
        });
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
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
