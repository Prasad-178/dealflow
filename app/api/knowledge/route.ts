import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { generateEmbedding, chunkText } from "@/lib/ai/embedding";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { content, sourceType, sourceId } = body;

  if (!content || !sourceType) {
    return NextResponse.json(
      { error: "content and sourceType are required" },
      { status: 400 }
    );
  }

  const validTypes = ["product_doc", "faq", "case_study", "pricing"];
  if (!validTypes.includes(sourceType)) {
    return NextResponse.json(
      { error: `sourceType must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Chunk the content and generate embeddings
  const chunks = chunkText(content);
  const inserted = [];

  for (let i = 0; i < chunks.length; i++) {
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(chunks[i]);
    } catch {
      // Continue without embedding if generation fails
    }

    const [entry] = await db
      .insert(embeddings)
      .values({
        companyId,
        content: chunks[i],
        sourceType,
        sourceId: sourceId || null,
        chunkIndex: i,
        embedding,
      })
      .returning();

    inserted.push(entry);
  }

  return NextResponse.json({ entries: inserted }, { status: 201 });
}
