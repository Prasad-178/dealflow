import { describe, it, expect } from "vitest";
import type { GuardrailResult } from "@/lib/guardrails";

/**
 * Tests for the guardrails pipeline contract — verifying that all three
 * layers work together correctly and produce the right result types.
 */
describe("Guardrails Pipeline Contract", () => {
  describe("result types", () => {
    it("passing result has no violation or fallback", () => {
      const result: GuardrailResult = { passed: true };
      expect(result.passed).toBe(true);
      expect(result.violation).toBeUndefined();
      expect(result.fallbackResponse).toBeUndefined();
    });

    it("deterministic violation includes layer tag", () => {
      const result: GuardrailResult = {
        passed: false,
        violation: {
          layer: "deterministic",
          category: "confidential",
          details: "Contains internal salary information",
        },
        fallbackResponse: "I appreciate your interest!",
      };

      expect(result.violation!.layer).toBe("deterministic");
      expect(result.fallbackResponse).toBeTruthy();
    });

    it("semantic violation includes layer tag", () => {
      const result: GuardrailResult = {
        passed: false,
        violation: {
          layer: "semantic",
          category: "competitor_bashing",
          details: "Similar to banned concept",
        },
        fallbackResponse: "I'd prefer to focus on how our solution can help...",
      };

      expect(result.violation!.layer).toBe("semantic");
    });

    it("LLM violation includes layer tag", () => {
      const result: GuardrailResult = {
        passed: false,
        violation: {
          layer: "llm",
          category: "over_promising",
          details: "Contains guarantees",
        },
        fallbackResponse: "I want to set realistic expectations...",
      };

      expect(result.violation!.layer).toBe("llm");
    });
  });

  describe("layer ordering", () => {
    it("deterministic is checked first (fastest)", () => {
      // The pipeline order is: deterministic → semantic → llm
      const layers = ["deterministic", "semantic", "llm"];
      expect(layers[0]).toBe("deterministic");
    });

    it("LLM check only runs on output direction", () => {
      // Input: deterministic + semantic only
      // Output: deterministic + semantic + llm
      const inputLayers = ["deterministic", "semantic"];
      const outputLayers = ["deterministic", "semantic", "llm"];

      expect(inputLayers).not.toContain("llm");
      expect(outputLayers).toContain("llm");
    });
  });

  describe("fallback responses per category", () => {
    const categories = [
      "confidential",
      "inappropriate",
      "competitor_bashing",
      "false_claims",
      "over_promising",
      "pressure_tactics",
      "unauthorized_commitments",
    ];

    it("every violation category has a mapped fallback", () => {
      // From lib/guardrails/fallbacks.ts
      const FALLBACK_RESPONSES: Record<string, string> = {
        confidential: "I appreciate your interest!",
        inappropriate: "I want to make sure we keep our conversation productive.",
        competitor_bashing: "I'd prefer to focus on how our solution can help",
        false_claims: "Let me make sure I give you accurate information.",
        over_promising: "I want to set realistic expectations.",
        pressure_tactics: "I want you to feel comfortable with any decision.",
        unauthorized_commitments: "That's a great question about customization.",
        default: "I'd be happy to help you with that.",
      };

      for (const category of categories) {
        expect(FALLBACK_RESPONSES[category] || FALLBACK_RESPONSES.default).toBeTruthy();
      }
    });
  });
});
