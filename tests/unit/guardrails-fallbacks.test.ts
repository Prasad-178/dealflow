import { describe, it, expect } from "vitest";
import { getFallbackResponse } from "@/lib/guardrails/fallbacks";

describe("Fallback Responses", () => {
  it("returns confidential fallback", () => {
    const response = getFallbackResponse("confidential");
    expect(response).toContain("connect you with our team");
  });

  it("returns inappropriate fallback", () => {
    const response = getFallbackResponse("inappropriate");
    expect(response).toContain("productive");
  });

  it("returns competitor_bashing fallback", () => {
    const response = getFallbackResponse("competitor_bashing");
    expect(response).toContain("focus on how our solution");
  });

  it("returns over_promising fallback", () => {
    const response = getFallbackResponse("over_promising");
    expect(response).toContain("realistic expectations");
  });

  it("returns default fallback for unknown category", () => {
    const response = getFallbackResponse("unknown_category_xyz");
    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(0);
  });

  it("all fallbacks are non-empty strings", () => {
    const categories = [
      "confidential",
      "inappropriate",
      "competitor_bashing",
      "false_claims",
      "over_promising",
      "pressure_tactics",
      "unauthorized_commitments",
    ];
    for (const cat of categories) {
      const response = getFallbackResponse(cat);
      expect(response).toBeTruthy();
      expect(typeof response).toBe("string");
    }
  });
});
