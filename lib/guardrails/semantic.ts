import { db } from "@/lib/db";
import { bannedConcepts } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cosineDistance, sql, eq, desc } from "drizzle-orm";

type SemanticResult = {
  passed: boolean;
  category?: string;
  details?: string;
};

const SIMILARITY_THRESHOLD = 0.85;

export async function checkSemanticSimilarity(
  content: string,
  companyId: string
): Promise<SemanticResult> {
  try {
    const contentEmbedding = await generateEmbedding(content);
    const similarity = sql<number>`1 - (${cosineDistance(bannedConcepts.embedding, contentEmbedding)})`;

    const results = await db
      .select({
        concept: bannedConcepts.concept,
        category: bannedConcepts.category,
        similarity,
      })
      .from(bannedConcepts)
      .where(eq(bannedConcepts.companyId, companyId))
      .orderBy(desc(similarity))
      .limit(1);

    if (results.length > 0 && results[0].similarity > SIMILARITY_THRESHOLD) {
      return {
        passed: false,
        category: results[0].category,
        details: `Content is semantically similar to banned concept: "${results[0].concept}" (similarity: ${results[0].similarity.toFixed(2)})`,
      };
    }

    return { passed: true };
  } catch {
    // If embedding fails, pass through (fail open for availability)
    return { passed: true };
  }
}
