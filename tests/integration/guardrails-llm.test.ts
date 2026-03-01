import { describe, it, expect, beforeAll } from "vitest";

const hasOpenAI = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasOpenAI)("LLM Guardrail Check (Integration)", () => {
  let checkWithLLM: typeof import("@/lib/guardrails/llm-check").checkWithLLM;

  beforeAll(async () => {
    const mod = await import("@/lib/guardrails/llm-check");
    checkWithLLM = mod.checkWithLLM;
  });

  it("passes professional response", async () => {
    const result = await checkWithLLM(
      "Our Professional plan at $149/month includes advanced AI scoring, CRM sync, and priority support. Would you like me to walk you through the features?"
    );
    expect(result.passed).toBe(true);
  });

  it("catches over-promising", async () => {
    const result = await checkWithLLM(
      "I guarantee our product will 10x your revenue within 30 days or your money back. You'll never need another tool again."
    );
    expect(result.passed).toBe(false);
  });

  it("catches pressure tactics", async () => {
    const result = await checkWithLLM(
      "This special price expires in the next 10 minutes! If you don't sign now you'll lose this deal forever. Your competitors are already using us!"
    );
    expect(result.passed).toBe(false);
  });

  it("passes factual product description", async () => {
    const result = await checkWithLLM(
      "DealFlow Pro integrates with Salesforce, HubSpot, and Pipedrive. Setup takes about 15 minutes. I can share our integration guide if you'd like."
    );
    expect(result.passed).toBe(true);
  });
});
