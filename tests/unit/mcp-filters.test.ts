import { describe, it, expect } from "vitest";
import {
  PRODUCTS,
  DOCS,
  CASE_STUDIES,
  searchDocsFilter,
  getCaseStudyFilter,
  getProductById,
} from "@/lib/mcp/server";

describe("MCP Server - Pure Logic", () => {
  describe("searchDocsFilter", () => {
    it("finds docs by title match", () => {
      const results = searchDocsFilter("Getting Started", DOCS);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Getting Started");
    });

    it("finds docs by content match", () => {
      const results = searchDocsFilter("Salesforce", DOCS);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Integration Guide");
    });

    it("is case-insensitive", () => {
      const results = searchDocsFilter("lead scoring", DOCS);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Lead Scoring");
    });

    it("returns multiple results when query matches several docs", () => {
      // "DealFlow" appears in Getting Started and Integration Guide content
      const results = searchDocsFilter("DealFlow", DOCS);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("returns empty array for no matches", () => {
      const results = searchDocsFilter("blockchain", DOCS);
      expect(results).toHaveLength(0);
    });

    it("matches partial words", () => {
      const results = searchDocsFilter("scor", DOCS);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getCaseStudyFilter", () => {
    it("finds SaaS case studies", () => {
      const results = getCaseStudyFilter("SaaS", CASE_STUDIES);
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("TechCorp");
    });

    it("finds Financial Services case studies", () => {
      const results = getCaseStudyFilter("Financial", CASE_STUDIES);
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("FinanceHub");
    });

    it("is case-insensitive", () => {
      const results = getCaseStudyFilter("saas", CASE_STUDIES);
      expect(results).toHaveLength(1);
    });

    it("returns empty for non-existent industry", () => {
      const results = getCaseStudyFilter("Healthcare", CASE_STUDIES);
      expect(results).toHaveLength(0);
    });

    it("matches partial industry names", () => {
      const results = getCaseStudyFilter("Financ", CASE_STUDIES);
      expect(results).toHaveLength(1);
    });
  });

  describe("getProductById", () => {
    it("returns first product when no ID provided", () => {
      const product = getProductById(undefined, PRODUCTS);
      expect(product).toBeTruthy();
      expect(product!.id).toBe("prod_1");
    });

    it("returns specific product by ID", () => {
      const product = getProductById("prod_1", PRODUCTS);
      expect(product).toBeTruthy();
      expect(product!.name).toBe("DealFlow Pro");
    });

    it("returns undefined for non-existent ID", () => {
      const product = getProductById("prod_999", PRODUCTS);
      expect(product).toBeUndefined();
    });

    it("product has correct pricing tiers", () => {
      const product = getProductById("prod_1", PRODUCTS);
      expect(product!.pricingTiers).toHaveLength(3);
      expect(product!.pricingTiers.map((t) => t.name)).toEqual([
        "Starter",
        "Professional",
        "Enterprise",
      ]);
    });
  });
});
