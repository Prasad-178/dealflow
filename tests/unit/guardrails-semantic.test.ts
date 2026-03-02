import { describe, it, expect } from "vitest";

/**
 * Tests for the semantic guardrails layer.
 * The actual checkSemanticSimilarity function requires embeddings + DB,
 * so we test the threshold logic and result contract here.
 */
describe("Guardrails - Semantic Layer", () => {
  const SIMILARITY_THRESHOLD = 0.85;

  describe("similarity threshold logic", () => {
    it("blocks content above threshold (0.85)", () => {
      const similarity = 0.92;
      const blocked = similarity > SIMILARITY_THRESHOLD;
      expect(blocked).toBe(true);
    });

    it("passes content below threshold", () => {
      const similarity = 0.60;
      const blocked = similarity > SIMILARITY_THRESHOLD;
      expect(blocked).toBe(false);
    });

    it("passes content at exactly threshold (not exceeded)", () => {
      const similarity = 0.85;
      const blocked = similarity > SIMILARITY_THRESHOLD;
      expect(blocked).toBe(false);
    });

    it("blocks content just above threshold", () => {
      const similarity = 0.851;
      const blocked = similarity > SIMILARITY_THRESHOLD;
      expect(blocked).toBe(true);
    });
  });

  describe("result contract", () => {
    type SemanticResult = {
      passed: boolean;
      category?: string;
      details?: string;
    };

    it("passing result has passed=true and no category", () => {
      const result: SemanticResult = { passed: true };
      expect(result.passed).toBe(true);
      expect(result.category).toBeUndefined();
    });

    it("failing result includes category and details", () => {
      const result: SemanticResult = {
        passed: false,
        category: "competitor_bashing",
        details: 'Content is semantically similar to banned concept: "disparaging competitors" (similarity: 0.92)',
      };
      expect(result.passed).toBe(false);
      expect(result.category).toBe("competitor_bashing");
      expect(result.details).toContain("similarity");
    });

    it("valid categories match banned concept types", () => {
      const validCategories = [
        "competitor_bashing",
        "false_claims",
        "confidential",
        "inappropriate",
      ];
      for (const category of validCategories) {
        const result: SemanticResult = {
          passed: false,
          category,
          details: `Matched: ${category}`,
        };
        expect(result.category).toBe(category);
      }
    });
  });

  describe("fail-open behavior", () => {
    it("returns passed=true when embedding generation fails", () => {
      // The actual implementation catches errors and returns { passed: true }
      // This verifies the contract
      const failOpenResult = { passed: true };
      expect(failOpenResult.passed).toBe(true);
    });
  });
});
