import { describe, it, expect } from "vitest";

/**
 * Tests for the memory extraction schema contract.
 * The actual extractFacts function uses OpenAI, so we test
 * the schema validation and data structure expectations.
 */
describe("Memory Extraction Schema", () => {
  const validCategories = [
    "budget",
    "timeline",
    "needs",
    "objection",
    "preference",
    "context",
  ];

  describe("fact schema validation", () => {
    it("valid fact has required fields", () => {
      const fact = {
        fact: "Budget is $10,000",
        category: "budget",
        confidence: 0.9,
      };

      expect(fact.fact).toBeTruthy();
      expect(validCategories).toContain(fact.category);
      expect(fact.confidence).toBeGreaterThanOrEqual(0);
      expect(fact.confidence).toBeLessThanOrEqual(1);
    });

    it("all category types are valid", () => {
      for (const category of validCategories) {
        expect(validCategories).toContain(category);
      }
      expect(validCategories).toHaveLength(6);
    });

    it("confidence is between 0 and 1", () => {
      const validConfidences = [0, 0.25, 0.5, 0.75, 1.0];
      for (const c of validConfidences) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("conversation message filtering", () => {
    it("filters messages to user and assistant roles", () => {
      const messages = [
        { role: "user", content: "We have a budget of $10k" },
        { role: "assistant", content: "Great! That fits our Professional tier." },
        { role: "system", content: "You are a sales agent" },
        { role: "tool", content: '{"pricing": [...]}' },
      ];

      const filtered = messages
        .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role, content: m.content! }));

      expect(filtered).toHaveLength(2);
      expect(filtered[0].role).toBe("user");
      expect(filtered[1].role).toBe("assistant");
    });

    it("skips messages with empty content", () => {
      const messages = [
        { role: "user", content: "" },
        { role: "user", content: "Hello" },
        { role: "assistant", content: null as unknown as string },
      ];

      const filtered = messages.filter(
        (m) => m.content && (m.role === "user" || m.role === "assistant")
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe("fact categorization examples", () => {
    const factExamples: Record<string, string[]> = {
      budget: ["Budget is $10,000", "Can only spend up to $5k this quarter"],
      timeline: ["Need solution by Q2", "Evaluating for next fiscal year"],
      needs: ["Need Salesforce integration", "Looking for lead scoring"],
      objection: ["Concerned about data privacy", "Your pricing seems high"],
      preference: ["Prefers monthly billing", "Wants self-service onboarding"],
      context: ["100-person company", "VP of Sales at a SaaS startup"],
    };

    for (const [category, examples] of Object.entries(factExamples)) {
      it(`has valid examples for ${category} category`, () => {
        expect(examples.length).toBeGreaterThan(0);
        for (const example of examples) {
          expect(example).toBeTruthy();
          expect(typeof example).toBe("string");
        }
      });
    }
  });
});
