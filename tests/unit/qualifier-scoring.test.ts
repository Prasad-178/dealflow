import { describe, it, expect } from "vitest";
import {
  calculateLeadScore,
  getTier,
  getRecommendation,
  deduplicateTags,
} from "@/lib/agents/qualifier";

describe("Qualifier Agent - Lead Scoring", () => {
  describe("calculateLeadScore", () => {
    it("scores maximum for enterprise + decision_maker + critical + immediate", () => {
      const score = calculateLeadScore("enterprise", "decision_maker", "critical", "immediate");
      expect(score).toBe(30 + 25 + 25 + 20); // 100
    });

    it("scores minimum for unknown values across all BANT", () => {
      const score = calculateLeadScore("unknown", "unknown", "unknown", "unknown");
      // unknown budget=5, unknown authority doesn't exist in BANT_SCORES (only decision_maker/influencer/user)
      // so it falls back to || 5 for authority unknown
      expect(score).toBe(5 + 5 + 5 + 5); // 20
    });

    it("scores correctly for mid_market + influencer + nice_to_have + this_quarter", () => {
      const score = calculateLeadScore("mid_market", "influencer", "nice_to_have", "this_quarter");
      expect(score).toBe(20 + 15 + 15 + 15); // 65
    });

    it("scores correctly for smb + user + exploring + no_timeline", () => {
      const score = calculateLeadScore("smb", "user", "exploring", "no_timeline");
      expect(score).toBe(10 + 10 + 5 + 5); // 30
    });

    it("falls back to 5 for invalid/unrecognized enum values", () => {
      const score = calculateLeadScore("invalid", "invalid", "invalid", "invalid");
      expect(score).toBe(20); // 4 * 5 fallback
    });

    it("handles mixed valid and invalid values", () => {
      const score = calculateLeadScore("enterprise", "invalid", "critical", "invalid");
      expect(score).toBe(30 + 5 + 25 + 5); // 65
    });
  });

  describe("getTier", () => {
    it("returns 'hot' for score >= 80", () => {
      expect(getTier(80)).toBe("hot");
      expect(getTier(100)).toBe("hot");
      expect(getTier(95)).toBe("hot");
    });

    it("returns 'warm' for score >= 50 and < 80", () => {
      expect(getTier(50)).toBe("warm");
      expect(getTier(79)).toBe("warm");
      expect(getTier(65)).toBe("warm");
    });

    it("returns 'cool' for score >= 30 and < 50", () => {
      expect(getTier(30)).toBe("cool");
      expect(getTier(49)).toBe("cool");
      expect(getTier(35)).toBe("cool");
    });

    it("returns 'cold' for score < 30", () => {
      expect(getTier(29)).toBe("cold");
      expect(getTier(0)).toBe("cold");
      expect(getTier(15)).toBe("cold");
    });

    // Boundary tests
    it("boundary: 79 is warm, 80 is hot", () => {
      expect(getTier(79)).toBe("warm");
      expect(getTier(80)).toBe("hot");
    });

    it("boundary: 49 is cool, 50 is warm", () => {
      expect(getTier(49)).toBe("cool");
      expect(getTier(50)).toBe("warm");
    });

    it("boundary: 29 is cold, 30 is cool", () => {
      expect(getTier(29)).toBe("cold");
      expect(getTier(30)).toBe("cool");
    });
  });

  describe("getRecommendation", () => {
    it("hot tier recommends booking a demo", () => {
      const rec = getRecommendation("hot");
      expect(rec).toContain("demo");
    });

    it("warm tier recommends nurturing", () => {
      const rec = getRecommendation("warm");
      expect(rec).toContain("nurturing");
    });

    it("cool tier recommends educational content", () => {
      const rec = getRecommendation("cool");
      expect(rec).toContain("educational");
    });

    it("cold tier also gets early stage recommendation", () => {
      const rec = getRecommendation("cold");
      expect(rec).toContain("Early stage");
    });
  });

  describe("deduplicateTags", () => {
    it("merges two disjoint sets", () => {
      const result = deduplicateTags(["enterprise"], ["urgent"]);
      expect(result).toEqual(["enterprise", "urgent"]);
    });

    it("deduplicates overlapping tags", () => {
      const result = deduplicateTags(["enterprise", "urgent"], ["urgent", "decision-maker"]);
      expect(result).toEqual(["enterprise", "urgent", "decision-maker"]);
    });

    it("handles empty existing tags", () => {
      const result = deduplicateTags([], ["new-tag"]);
      expect(result).toEqual(["new-tag"]);
    });

    it("handles empty new tags", () => {
      const result = deduplicateTags(["existing"], []);
      expect(result).toEqual(["existing"]);
    });

    it("handles both empty", () => {
      const result = deduplicateTags([], []);
      expect(result).toEqual([]);
    });

    it("handles fully duplicate input", () => {
      const result = deduplicateTags(["a", "b"], ["a", "b"]);
      expect(result).toEqual(["a", "b"]);
    });
  });
});
