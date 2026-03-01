import { generateObject } from "ai";
import { z } from "zod";
import { memoryModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embedding";

const factsSchema = z.object({
  facts: z.array(
    z.object({
      fact: z.string().describe("A specific fact about the prospect"),
      category: z.enum([
        "budget",
        "timeline",
        "needs",
        "objection",
        "preference",
        "context",
      ]),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("How confident are you about this fact"),
    })
  ),
});

export async function extractFacts(
  conversationMessages: { role: string; content: string }[],
  prospectId: string,
  conversationId: string
) {
  const { object } = await generateObject({
    model: memoryModel,
    schema: factsSchema,
    system: `You are a fact extraction specialist. Extract specific, actionable facts about the prospect from this conversation.

Focus on:
- Budget information (specific numbers, ranges, constraints)
- Timeline (when they need a solution, urgency)
- Needs (specific problems, requirements, use cases)
- Objections (concerns, hesitations, blockers)
- Preferences (preferred features, communication style, decision process)
- Context (company size, industry, role, current tools)

Rules:
- Only extract facts that are explicitly stated or strongly implied
- Each fact should be a single, specific piece of information
- Set confidence based on how explicitly stated the fact is
- Do NOT extract generic or obvious information`,
    messages: conversationMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content || "",
    })),
  });

  // Store facts with embeddings
  for (const fact of object.facts) {
    const embedding = await generateEmbedding(fact.fact);
    await db.insert(memories).values({
      prospectId,
      fact: fact.fact,
      category: fact.category,
      confidence: fact.confidence,
      embedding,
      sourceConversationId: conversationId,
    });
  }

  return object.facts;
}
