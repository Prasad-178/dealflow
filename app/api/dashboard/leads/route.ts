import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { prospects } from "@/lib/db/schema";
import { eq, desc, asc, ilike, sql, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [eq(prospects.companyId, companyId)];

  if (search) {
    conditions.push(
      or(
        ilike(prospects.name, `%${search}%`),
        ilike(prospects.email, `%${search}%`),
        ilike(prospects.company, `%${search}%`)
      )!
    );
  }

  const where = conditions.length > 1 ? sql`${conditions[0]} AND ${conditions[1]}` : conditions[0];

  const sortColumn =
    sortBy === "score"
      ? prospects.qualificationScore
      : sortBy === "name"
        ? prospects.name
        : prospects.createdAt;

  const orderFn = order === "asc" ? asc : desc;

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospects)
    .where(where);

  const results = await db
    .select()
    .from(prospects)
    .where(where)
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    leads: results,
    total: totalResult.count,
    page,
    totalPages: Math.ceil(totalResult.count / limit),
  });
}
