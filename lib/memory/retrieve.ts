import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cosineDistance, desc, sql, eq } from "drizzle-orm";

// --- Extracted pure logic for testability ---

export function formatMemoriesAsContext(
  memoryList: { fact: string; category: string }[]
): string {
  if (memoryList.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const mem of memoryList) {
    if (!grouped[mem.category]) grouped[mem.category] = [];
    grouped[mem.category].push(mem.fact);
  }

  let context = "## Known Information About This Prospect\n";
  for (const [category, facts] of Object.entries(grouped)) {
    context += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
    for (const fact of facts) {
      context += `- ${fact}\n`;
    }
  }

  return context;
}

export async function retrieveMemories(
  prospectId: string,
  currentQuery?: string,
  limit = 10
): Promise<string> {
  let relevantMemories;

  if (currentQuery) {
    // Semantic search for most relevant memories
    const queryEmbedding = await generateEmbedding(currentQuery);
    const similarity = sql<number>`1 - (${cosineDistance(memories.embedding, queryEmbedding)})`;

    relevantMemories = await db
      .select({
        fact: memories.fact,
        category: memories.category,
        confidence: memories.confidence,
        similarity,
      })
      .from(memories)
      .where(eq(memories.prospectId, prospectId))
      .orderBy(desc(similarity))
      .limit(limit);
  } else {
    // Get all memories for this prospect
    relevantMemories = await db
      .select({
        fact: memories.fact,
        category: memories.category,
        confidence: memories.confidence,
      })
      .from(memories)
      .where(eq(memories.prospectId, prospectId))
      .orderBy(desc(memories.confidence))
      .limit(limit);
  }

  return formatMemoriesAsContext(relevantMemories);
}
