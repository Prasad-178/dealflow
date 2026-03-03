import { generateText, tool } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embedding";
import { cosineDistance, desc, sql, eq, gt } from "drizzle-orm";

export async function runKnowledgeAgent({
  messages,
  companyId,
  prospectContext,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  companyId: string;
  prospectContext?: string;
}) {
  const result = await generateText({
    model: agentModel,
    experimental_telemetry: { isEnabled: true, functionId: "knowledge-agent" },
    system: `You are a knowledgeable product specialist AI assistant for a B2B company.
Your job is to answer prospect questions about the product using ONLY information from the knowledge base.

RULES:
- Always search the knowledge base before answering product questions
- Only state facts that come from search results - never make up features or capabilities
- If you can't find the answer, say "I'd be happy to connect you with our team for more details on that"
- Be conversational and helpful, not robotic
- If the prospect seems like a good fit, subtly encourage them to book a demo
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`,
    messages,
    tools: {
      searchKnowledgeBase: tool({
        description:
          "Search the product knowledge base for relevant information. Use this for any product, feature, or FAQ questions.",
        parameters: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }) => {
          const queryEmbedding = await generateEmbedding(query);
          const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

          const results = await db
            .select({
              content: embeddings.content,
              sourceType: embeddings.sourceType,
              similarity,
            })
            .from(embeddings)
            .where(eq(embeddings.companyId, companyId))
            .orderBy(desc(similarity))
            .limit(5);

          return results
            .filter((r) => r.similarity > 0.3)
            .map((r) => ({
              content: r.content,
              sourceType: r.sourceType,
              relevance: Math.round(r.similarity * 100) / 100,
            }));
        },
      }),
      getCaseStudy: tool({
        description:
          "Get a relevant case study by industry or use case",
        parameters: z.object({
          industry: z.string().describe("Industry to find case studies for"),
        }),
        execute: async ({ industry }) => {
          const queryEmbedding = await generateEmbedding(
            `case study ${industry}`
          );
          const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`;

          const results = await db
            .select({
              content: embeddings.content,
              similarity,
            })
            .from(embeddings)
            .where(
              sql`${embeddings.companyId} = ${companyId} AND ${embeddings.sourceType} = 'case_study'`
            )
            .orderBy(desc(similarity))
            .limit(2);

          return results.map((r) => r.content);
        },
      }),
    },
    maxSteps: 3,
  });

  return {
    status: "completed" as const,
    response: result.text,
    toolCalls: result.steps.flatMap((s) => s.toolCalls),
  };
}
