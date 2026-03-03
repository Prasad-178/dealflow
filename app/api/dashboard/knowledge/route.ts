import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // Get counts by sourceType
  const typeCounts = await db
    .select({
      sourceType: embeddings.sourceType,
      count: sql<number>`count(*)::int`,
    })
    .from(embeddings)
    .where(eq(embeddings.companyId, companyId))
    .groupBy(embeddings.sourceType);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(embeddings)
    .where(eq(embeddings.companyId, companyId));

  const entries = await db
    .select({
      id: embeddings.id,
      content: embeddings.content,
      sourceType: embeddings.sourceType,
      sourceId: embeddings.sourceId,
      createdAt: embeddings.createdAt,
    })
    .from(embeddings)
    .where(eq(embeddings.companyId, companyId))
    .orderBy(desc(embeddings.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    entries,
    typeCounts: Object.fromEntries(typeCounts.map((t) => [t.sourceType, t.count])),
    total: totalResult.count,
    page,
    totalPages: Math.ceil(totalResult.count / limit),
  });
}
