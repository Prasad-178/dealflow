import { describe, it, expect } from "vitest";
import { shouldRerouteToDeal, resolveAgentType } from "@/lib/agents/routing";

describe("Chat Route - Routing Logic", () => {
  describe("shouldRerouteToDeal", () => {
    const hotLeadToolCall = {
      toolName: "scoreLeadFit",
      args: { budget: "enterprise", authority: "decision_maker", need: "critical", timeline: "immediate" },
    };

    const nonHotLeadToolCall = {
      toolName: "scoreLeadFit",
      args: { budget: "smb", authority: "user", need: "exploring", timeline: "no_timeline" },
    };

    it("re-routes when qualifier + completed + hot lead + pricing signal", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "Let me show you our pricing plans", [hotLeadToolCall])
      ).toBe(true);
    });

    it("re-routes when response contains 'proposal'", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "I can draft a proposal for you", [hotLeadToolCall])
      ).toBe(true);
    });

    it("re-routes when response contains 'book a demo'", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "Would you like to book a demo?", [hotLeadToolCall])
      ).toBe(true);
    });

    it("does NOT re-route when agent is not qualifier", () => {
      expect(
        shouldRerouteToDeal("knowledge", "completed", "Here is our pricing", [hotLeadToolCall])
      ).toBe(false);
    });

    it("does NOT re-route when status is not completed", () => {
      expect(
        shouldRerouteToDeal("qualifier", "needs_approval", "pricing info", [hotLeadToolCall])
      ).toBe(false);
    });

    it("does NOT re-route when lead is not hot (no enterprise budget)", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "Here is our pricing", [nonHotLeadToolCall])
      ).toBe(false);
    });

    it("does NOT re-route when no pricing signal in response", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "Great to meet you! Tell me more about your needs.", [hotLeadToolCall])
      ).toBe(false);
    });

    it("does NOT re-route when both conditions are missing", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "Nice to meet you", [nonHotLeadToolCall])
      ).toBe(false);
    });

    it("handles empty tool calls array", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "pricing info", [])
      ).toBe(false);
    });

    it("handles tool calls without scoreLeadFit", () => {
      const otherToolCall = { toolName: "tagLead", args: { tags: ["enterprise"] } };
      expect(
        shouldRerouteToDeal("qualifier", "completed", "pricing info", [otherToolCall])
      ).toBe(false);
    });

    it("is case-insensitive for pricing signal detection", () => {
      expect(
        shouldRerouteToDeal("qualifier", "completed", "PRICING plans available", [hotLeadToolCall])
      ).toBe(true);
    });
  });

  describe("resolveAgentType", () => {
    it("returns 'knowledge' for valid knowledge type", () => {
      expect(resolveAgentType("knowledge")).toBe("knowledge");
    });

    it("returns 'qualifier' for valid qualifier type", () => {
      expect(resolveAgentType("qualifier")).toBe("qualifier");
    });

    it("returns 'deal' for valid deal type", () => {
      expect(resolveAgentType("deal")).toBe("deal");
    });

    it("returns 'scheduler' for valid scheduler type", () => {
      expect(resolveAgentType("scheduler")).toBe("scheduler");
    });

    it("defaults to 'knowledge' for unknown agent type", () => {
      expect(resolveAgentType("unknown")).toBe("knowledge");
    });

    it("defaults to 'knowledge' for empty string", () => {
      expect(resolveAgentType("")).toBe("knowledge");
    });

    it("defaults to 'knowledge' for random string", () => {
      expect(resolveAgentType("foobar")).toBe("knowledge");
    });
  });
});
