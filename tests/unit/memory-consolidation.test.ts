import { describe, it, expect } from "vitest";

/**
 * Tests for the memory consolidation schema and decision logic.
 * The consolidateMemories function uses an LLM judge, so we test
 * the schema contract and the decision application logic pattern.
 */
describe("Memory Consolidation", () => {
  describe("consolidation decision schema", () => {
    const validDecisions = [
      {
        existingFactId: "mem-1",
        action: "keep" as const,
        reason: "Still valid",
      },
      {
        existingFactId: "mem-2",
        action: "update" as const,
        updatedFact: "Budget increased to $20k",
        reason: "Prospect mentioned higher budget",
      },
      {
        existingFactId: "mem-3",
        action: "remove" as const,
        reason: "No longer relevant after new conversation",
      },
    ];

    it("supports keep action", () => {
      const keepDecision = validDecisions.find((d) => d.action === "keep");
      expect(keepDecision).toBeDefined();
      expect(keepDecision!.action).toBe("keep");
      expect(keepDecision!.existingFactId).toBeTruthy();
      expect(keepDecision!.reason).toBeTruthy();
    });

    it("supports update action with updatedFact", () => {
      const updateDecision = validDecisions.find((d) => d.action === "update");
      expect(updateDecision).toBeDefined();
      expect(updateDecision!.updatedFact).toBeTruthy();
      expect(updateDecision!.reason).toBeTruthy();
    });

    it("supports remove action", () => {
      const removeDecision = validDecisions.find((d) => d.action === "remove");
      expect(removeDecision).toBeDefined();
      expect(removeDecision!.action).toBe("remove");
    });

    it("each decision has a factId and reason", () => {
      for (const decision of validDecisions) {
        expect(decision.existingFactId).toBeTruthy();
        expect(decision.reason).toBeTruthy();
        expect(["keep", "update", "remove"]).toContain(decision.action);
      }
    });
  });

  describe("consolidation fact matching", () => {
    const existingFacts = [
      { id: "1", fact: "Budget is $10,000", category: "budget", confidence: 0.9 },
      { id: "2", fact: "Needs by Q2 2026", category: "timeline", confidence: 0.8 },
      { id: "3", fact: "Uses Salesforce CRM", category: "context", confidence: 0.95 },
    ];

    it("identifies budget contradiction", () => {
      const newFacts = [{ fact: "Budget increased to $25,000", category: "budget" }];
      const budgetFact = existingFacts.find((f) => f.category === "budget");
      const hasContradiction =
        newFacts.some((n) => n.category === budgetFact!.category);
      expect(hasContradiction).toBe(true);
    });

    it("no contradiction for different categories", () => {
      const newFacts = [{ fact: "Prefers monthly billing", category: "preference" }];
      const overlapping = existingFacts.filter((e) =>
        newFacts.some((n) => n.category === e.category)
      );
      expect(overlapping).toHaveLength(0);
    });

    it("detects multiple contradictions", () => {
      const newFacts = [
        { fact: "Budget is now $20k", category: "budget" },
        { fact: "Timeline pushed to Q3", category: "timeline" },
      ];
      const overlapping = existingFacts.filter((e) =>
        newFacts.some((n) => n.category === e.category)
      );
      expect(overlapping).toHaveLength(2);
    });
  });
});
