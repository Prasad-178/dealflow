import { generateObject } from "ai";
import { z } from "zod";
import { supervisorModel } from "@/lib/ai/models";

const intentSchema = z.object({
  intent: z.enum([
    "product_question",
    "pricing",
    "scheduling",
    "qualification",
    "general",
    "objection",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type Intent = z.infer<typeof intentSchema>;

export type AgentType = "knowledge" | "deal" | "scheduler" | "qualifier";

const intentToAgent: Record<string, AgentType> = {
  product_question: "knowledge",
  pricing: "deal",
  scheduling: "scheduler",
  qualification: "qualifier",
  general: "knowledge",
  objection: "deal",
};

export async function classifyIntent(
  messages: { role: string; content: string }[]
): Promise<{ intent: Intent; agent: AgentType }> {
  const { object } = await generateObject({
    model: supervisorModel,
    schema: intentSchema,
    experimental_telemetry: { isEnabled: true, functionId: "supervisor-classify" },
    system: `You are an intent classifier for a business development AI agent.
Classify the prospect's latest message into one of these categories:
- product_question: asking about product features, capabilities, integrations, technical details
- pricing: asking about cost, pricing tiers, discounts, proposals, ROI
- scheduling: wanting to book a demo, meeting, call, or check availability
- qualification: providing info about their company, budget, timeline, needs (or you need to ask)
- general: greetings, general conversation, or unclear intent
- objection: pushing back, expressing concerns, comparing with competitors

Focus on the LATEST message in the conversation for classification.`,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  return {
    intent: object,
    agent: intentToAgent[object.intent],
  };
}
