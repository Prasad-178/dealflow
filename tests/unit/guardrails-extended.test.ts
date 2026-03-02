import { describe, it, expect } from "vitest";
import { checkDeterministicRules } from "@/lib/guardrails/deterministic";

describe("Deterministic Guardrails - Extended Coverage", () => {
  describe("previously untested confidential patterns", () => {
    it("blocks acquisition target mentions", () => {
      const result = checkDeterministicRules("Our acquisition target is CompanyX");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks confidential project mentions", () => {
      const result = checkDeterministicRules("This is a confidential project we're working on");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });
  });

  describe("case insensitivity", () => {
    it("blocks INTERNAL PRICING MARGIN (uppercase)", () => {
      const result = checkDeterministicRules("Our INTERNAL PRICING MARGIN is 80%");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks Employee Salary (mixed case)", () => {
      const result = checkDeterministicRules("The Employee Salary range is $100k-150k");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks BOARD MEETING NOTES (uppercase)", () => {
      const result = checkDeterministicRules("Check the BOARD MEETING NOTES for details");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });
  });

  describe("competitor bashing detection", () => {
    it("blocks 'competitor name sucks' pattern", () => {
      const result = checkDeterministicRules("competitor name sucks compared to us");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("competitor_bashing");
    });

    it("blocks 'don't use X, they are terrible' pattern", () => {
      const result = checkDeterministicRules("don't use Acme, they are terrible");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("competitor_bashing");
    });

    it("blocks 'don't use X, they're bad' (contraction)", () => {
      const result = checkDeterministicRules("don't use CompetitorX, they're bad at this");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("competitor_bashing");
    });
  });

  describe("details field in results", () => {
    it("includes pattern source in confidential details", () => {
      const result = checkDeterministicRules("internal pricing margin is high");
      expect(result.details).toBeTruthy();
      expect(result.details).toContain("confidential pattern");
    });

    it("includes details for inappropriate content", () => {
      const result = checkDeterministicRules("what a stupid idea");
      expect(result.details).toBeTruthy();
      expect(result.details).toContain("inappropriate");
    });

    it("includes details for competitor bashing", () => {
      const result = checkDeterministicRules("competitor name sucks");
      expect(result.details).toBeTruthy();
      expect(result.details).toContain("competitor");
    });

    it("does not include details for passing content", () => {
      const result = checkDeterministicRules("Tell me about your product");
      expect(result.details).toBeUndefined();
      expect(result.category).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles very long input without false positives", () => {
      const longInput = "Our product has many great features. ".repeat(100);
      const result = checkDeterministicRules(longInput);
      expect(result.passed).toBe(true);
    });

    it("does not false-positive on 'internal' without 'pricing margin'", () => {
      const result = checkDeterministicRules("We use internal tools for development");
      expect(result.passed).toBe(true);
    });

    it("does not false-positive on 'salary' without 'employee'", () => {
      const result = checkDeterministicRules("What salary range are you expecting?");
      expect(result.passed).toBe(true);
    });

    it("blocks content with leading/trailing whitespace", () => {
      const result = checkDeterministicRules("   internal pricing margin   ");
      expect(result.passed).toBe(false);
    });
  });
});
