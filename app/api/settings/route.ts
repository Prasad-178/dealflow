import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;

  const [company] = await db
    .select({ guardrailConfig: companies.guardrailConfig })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(company.guardrailConfig);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const body = await request.json();

  const { blockedTopics, maxDiscountPercent, requireApprovalForProposals, requireApprovalForMeetings } = body;

  const [updated] = await db
    .update(companies)
    .set({
      guardrailConfig: {
        blockedTopics: blockedTopics ?? [],
        maxDiscountPercent: maxDiscountPercent ?? 25,
        requireApprovalForProposals: requireApprovalForProposals ?? true,
        requireApprovalForMeetings: requireApprovalForMeetings ?? true,
      },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning({ guardrailConfig: companies.guardrailConfig });

  return NextResponse.json(updated.guardrailConfig);
}
