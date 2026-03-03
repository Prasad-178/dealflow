import { embed, embedMany } from "ai";
import { embeddingModel } from "./models";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    experimental_telemetry: { isEnabled: true, functionId: "embed-single" },
  });
  return embedding;
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    experimental_telemetry: { isEnabled: true, functionId: "embed-batch" },
  });
  return embeddings;
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap
      const words = current.split(" ");
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
