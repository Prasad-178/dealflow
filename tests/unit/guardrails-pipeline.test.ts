import { describe, it, expect, vi } from "vitest";

// Mock the semantic and LLM guardrails since they need DB/API
vi.mock("@/lib/guardrails/semantic", () => ({
  checkSemanticSimilarity: vi.fn().mockResolvedValue({ passed: true }),
}));

vi.mock("@/lib/guardrails/llm-check", () => ({
  checkWithLLM: vi.fn().mockResolvedValue({ passed: true }),
}));

import { runGuardrails } from "@/lib/guardrails";

describe("Guardrails Pipeline", () => {
  it("blocks input that fails deterministic rules", async () => {
    const result = await runGuardrails(
      "Our internal pricing margin details",
      "test-company-id",
      "input"
    );
    expect(result.passed).toBe(false);
    expect(result.violation?.layer).toBe("deterministic");
    expect(result.fallbackResponse).toBeTruthy();
  });

  it("passes clean input through all layers", async () => {
    const result = await runGuardrails(
      "What features does your product have?",
      "test-company-id",
      "input"
    );
    expect(result.passed).toBe(true);
  });

  it("passes clean output through all 3 layers", async () => {
    const result = await runGuardrails(
      "Our product offers CRM integration, lead scoring, and email automation.",
      "test-company-id",
      "output"
    );
    expect(result.passed).toBe(true);
  });

  it("returns fallback response on violation", async () => {
    const result = await runGuardrails(
      "Let me share our employee salary details",
      "test-company-id",
      "input"
    );
    expect(result.passed).toBe(false);
    expect(result.fallbackResponse).toBeTruthy();
    expect(typeof result.fallbackResponse).toBe("string");
  });
});
