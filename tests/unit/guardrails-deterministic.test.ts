import { describe, it, expect } from "vitest";
import { checkDeterministicRules } from "@/lib/guardrails/deterministic";

describe("Deterministic Guardrails", () => {
  describe("confidential information detection", () => {
    it("blocks internal pricing margin mentions", () => {
      const result = checkDeterministicRules("Our internal pricing margin is 80%");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks employee salary mentions", () => {
      const result = checkDeterministicRules("The employee salary for engineers is $150k");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks board meeting notes", () => {
      const result = checkDeterministicRules("According to the board meeting notes from last week");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });

    it("blocks internal roadmap mentions", () => {
      const result = checkDeterministicRules("Our internal roadmap shows we're building X");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("confidential");
    });
  });

  describe("inappropriate language detection", () => {
    it("blocks profanity", () => {
      const result = checkDeterministicRules("This damn product is broken");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("inappropriate");
    });

    it("blocks insults", () => {
      const result = checkDeterministicRules("That's a stupid question");
      expect(result.passed).toBe(false);
      expect(result.category).toBe("inappropriate");
    });
  });

  describe("allows clean content", () => {
    it("passes normal product questions", () => {
      const result = checkDeterministicRules("What integrations do you support?");
      expect(result.passed).toBe(true);
    });

    it("passes pricing questions", () => {
      const result = checkDeterministicRules("How much does the Enterprise plan cost?");
      expect(result.passed).toBe(true);
    });

    it("passes scheduling questions", () => {
      const result = checkDeterministicRules("Can we schedule a demo next Tuesday?");
      expect(result.passed).toBe(true);
    });

    it("passes empty content", () => {
      const result = checkDeterministicRules("");
      expect(result.passed).toBe(true);
    });

    it("passes general sales conversation", () => {
      const result = checkDeterministicRules(
        "We're a 200-person fintech company looking for sales automation. Our budget is about $10k/year."
      );
      expect(result.passed).toBe(true);
    });
  });
});
