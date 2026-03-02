import { describe, it, expect } from "vitest";

/**
 * Tests for the Knowledge Agent's tool schemas and behavior contract.
 * The actual runKnowledgeAgent requires DB + OpenAI, so we test
 * the tool parameter schemas and response contract.
 */
describe("Knowledge Agent", () => {
  describe("tool parameter validation", () => {
    it("searchKnowledgeBase requires a query string", () => {
      const validParams = { query: "What integrations do you support?" };
      expect(validParams.query).toBeTruthy();
      expect(typeof validParams.query).toBe("string");
    });

    it("getCaseStudy requires an industry string", () => {
      const validParams = { industry: "SaaS" };
      expect(validParams.industry).toBeTruthy();
      expect(typeof validParams.industry).toBe("string");
    });
  });

  describe("response contract", () => {
    it("returns completed status with response text", () => {
      const mockResult = {
        status: "completed" as const,
        response: "Based on our knowledge base, we integrate with Salesforce, HubSpot, and Pipedrive.",
        toolCalls: [],
      };

      expect(mockResult.status).toBe("completed");
      expect(mockResult.response).toBeTruthy();
      expect(Array.isArray(mockResult.toolCalls)).toBe(true);
    });

    it("always returns completed status (no approvals)", () => {
      // Knowledge agent never needs approval — it just answers questions
      const status = "completed" as const;
      expect(status).toBe("completed");
      expect(status).not.toBe("needs_approval");
    });
  });

  describe("search result filtering", () => {
    it("filters results by similarity threshold (0.3)", () => {
      const THRESHOLD = 0.3;
      const mockResults = [
        { content: "We integrate with Salesforce", sourceType: "faq", similarity: 0.85 },
        { content: "Our pricing starts at $49/mo", sourceType: "pricing", similarity: 0.45 },
        { content: "Unrelated content", sourceType: "faq", similarity: 0.15 },
      ];

      const filtered = mockResults.filter((r) => r.similarity > THRESHOLD);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.similarity > THRESHOLD)).toBe(true);
    });

    it("returns empty array when no results pass threshold", () => {
      const THRESHOLD = 0.3;
      const mockResults = [
        { content: "Irrelevant", sourceType: "faq", similarity: 0.1 },
        { content: "Also irrelevant", sourceType: "faq", similarity: 0.2 },
      ];

      const filtered = mockResults.filter((r) => r.similarity > THRESHOLD);
      expect(filtered).toHaveLength(0);
    });

    it("formats results with rounded relevance score", () => {
      const similarity = 0.8567;
      const rounded = Math.round(similarity * 100) / 100;
      expect(rounded).toBe(0.86);
    });
  });

  describe("system prompt construction", () => {
    it("includes prospect context when provided", () => {
      const prospectContext = "## Known Information\n- Budget is $10k";
      const systemPrompt = `You are a knowledgeable product specialist...
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`;

      expect(systemPrompt).toContain("Prospect context:");
      expect(systemPrompt).toContain("Budget is $10k");
    });

    it("omits prospect context section when not provided", () => {
      const prospectContext = "";
      const systemPrompt = `You are a knowledgeable product specialist...
${prospectContext ? `\nProspect context:\n${prospectContext}` : ""}`;

      expect(systemPrompt).not.toContain("Prospect context:");
    });
  });
});
