import { generateText, tool } from "ai";
import { z } from "zod";
import { agentModel } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { companies, pendingApprovals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// --- Extracted pure logic for testability ---

export function isDiscountAutoApproved(discountPercent: number): boolean {
  return discountPercent <= 10;
}

export type PricingTier = {
  product: string;
  tier: string;
  price: number;
  billingCycle: string;
  features: string[];
};

export function filterPricingTiers(
  products: { name: string; pricingTiers: { name: string; price: number; billingCycle: string; features: string[] }[] }[],
  tier?: string
): PricingTier[] {
  const allTiers = products.flatMap((p) =>
    p.pricingTiers.map((t) => ({
      product: p.name,
      tier: t.name,
      price: t.price,
      billingCycle: t.billingCycle,
      features: t.features,
    }))
  );
  if (tier && tier !== "all") {
    return allTiers.filter(
      (t) => t.tier.toLowerCase() === tier.toLowerCase()
    );
  }
  return allTiers;
}

export function detectApprovalStatus(steps: { toolResults: any[] }[]): boolean {
  return steps.some((s) =>
    s.toolResults.some(
      (tr: any) => tr?.result?.status === "pending_approval"
    )
  );
}

export async function runDealAgent({
  messages,
  companyId,
  conversationId,
  prospectContext,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  companyId: string;
  conversationId: string;
  prospectContext?: string;
}) {
  // Fetch company pricing data
  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const companyData = company[0];
  const pricingInfo = companyData?.products
    ? JSON.stringify(companyData.products, null, 2)
    : "No pricing data available";

  const result = await generateText({
    model: agentModel,
    system: `You are a skilled sales negotiation specialist.
Your job is to discuss pricing, handle objections, and close deals.

PRICING DATA:
${pricingInfo}

RULES:
- Always reference actual pricing tiers - never make up prices
- You can share standard pricing freely
- For discounts up to 10%, you can offer them autonomously
- For discounts > 10% or custom proposals, request approval (the tool will handle this)
- Handle price objections professionally - focus on value, ROI, and competitive advantages
- Never trash competitors - focus on your own strengths
- If the prospect is ready, encourage them to move forward with a proposal
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`,
    messages,
    tools: {
      getPricing: tool({
        description: "Get current pricing tiers and plans",
        parameters: z.object({
          tier: z
            .enum(["starter", "professional", "enterprise", "all"])
            .optional()
            .describe("Specific pricing tier to look up, or 'all' for all tiers"),
        }),
        execute: async ({ tier }) => {
          if (!companyData?.products) {
            return { error: "No pricing data configured" };
          }
          const allTiers = companyData.products.flatMap((p) =>
            p.pricingTiers.map((t) => ({
              product: p.name,
              tier: t.name,
              price: t.price,
              billingCycle: t.billingCycle,
              features: t.features,
            }))
          );
          if (tier && tier !== "all") {
            return allTiers.filter(
              (t) => t.tier.toLowerCase() === tier.toLowerCase()
            );
          }
          return allTiers;
        },
      }),
      draftProposal: tool({
        description: "Draft a proposal for the prospect. This creates a draft that needs approval before sending.",
        parameters: z.object({
          prospectName: z.string(),
          selectedTier: z.string(),
          customizations: z.string().optional(),
          discountPercent: z.number().optional(),
          notes: z.string().optional(),
        }),
        execute: async ({
          prospectName,
          selectedTier,
          customizations,
          discountPercent,
          notes,
        }) => {
          // Create pending approval for the proposal
          await db.insert(pendingApprovals).values({
            companyId,
            conversationId,
            toolName: "sendProposal",
            toolInput: {
              prospectName,
              selectedTier,
              customizations,
              discountPercent: discountPercent || 0,
              notes,
            },
            agentType: "deal",
            status: "pending",
          });

          return {
            status: "pending_approval",
            message: `Proposal draft created for ${prospectName} (${selectedTier} tier${discountPercent ? `, ${discountPercent}% discount` : ""}). Awaiting sales team approval before sending.`,
          };
        },
      }),
      applyDiscount: tool({
        description:
          "Apply a discount to a deal. Discounts up to 10% are auto-approved. Larger discounts need approval.",
        parameters: z.object({
          discountPercent: z
            .number()
            .min(1)
            .max(50)
            .describe("Discount percentage"),
          reason: z.string().describe("Reason for the discount"),
          tier: z.string().describe("Which pricing tier"),
        }),
        execute: async ({ discountPercent, reason, tier }) => {
          if (discountPercent > 10) {
            // Needs HITL approval
            await db.insert(pendingApprovals).values({
              companyId,
              conversationId,
              toolName: "applyDiscount",
              toolInput: { discountPercent, reason, tier },
              agentType: "deal",
              status: "pending",
            });

            return {
              status: "pending_approval",
              message: `A ${discountPercent}% discount request has been submitted for approval. Our team will review it shortly.`,
            };
          }

          // Auto-approved
          return {
            status: "approved",
            discountPercent,
            message: `Great news! I can offer you a ${discountPercent}% discount on the ${tier} plan.`,
          };
        },
      }),
    },
    maxSteps: 5,
  });

  const hasApprovals = result.steps.some((s) =>
    s.toolResults.some(
      (tr: any) => tr?.result?.status === "pending_approval"
    )
  );

  return {
    status: hasApprovals ? ("needs_approval" as const) : ("completed" as const),
    response: result.text,
    toolCalls: result.steps.flatMap((s) => s.toolCalls),
  };
}
