import { generateObject } from "ai";
import { z } from "zod";
import { memoryModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const consolidationSchema = z.object({
  decisions: z.array(
    z.object({
      existingFactId: z.string(),
      action: z.enum(["keep", "update", "remove"]),
      updatedFact: z.string().optional(),
      reason: z.string(),
    })
  ),
});

export async function consolidateMemories(
  prospectId: string,
  newFacts: { fact: string; category: string }[]
) {
  // Get existing memories
  const existingMemories = await db
    .select()
    .from(memories)
    .where(eq(memories.prospectId, prospectId));

  if (existingMemories.length === 0) return;

  // Check for contradictions
  const { object } = await generateObject({
    model: memoryModel,
    schema: consolidationSchema,
    experimental_telemetry: { isEnabled: true, functionId: "memory-consolidate" },
    prompt: `Compare these existing facts about a prospect with newly extracted facts.
Identify any contradictions or outdated information.

EXISTING FACTS:
${existingMemories.map((m) => `[${m.id}] ${m.fact} (category: ${m.category}, confidence: ${m.confidence})`).join("\n")}

NEW FACTS:
${newFacts.map((f) => `- ${f.fact} (category: ${f.category})`).join("\n")}

For each existing fact that conflicts with a new fact, decide:
- "keep": existing fact is still valid
- "update": replace with new information (provide updatedFact)
- "remove": fact is no longer relevant

Only include decisions for facts that need action. Skip facts with no conflicts.`,
  });

  // Apply decisions
  for (const decision of object.decisions) {
    if (decision.action === "update" && decision.updatedFact) {
      await db
        .update(memories)
        .set({
          fact: decision.updatedFact,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, decision.existingFactId));
    } else if (decision.action === "remove") {
      await db
        .delete(memories)
        .where(eq(memories.id, decision.existingFactId));
    }
  }

  return object.decisions;
}
