import { describe, it, expect } from "vitest";
import { formatMemoriesAsContext } from "@/lib/memory/retrieve";

describe("Memory Retrieve - Formatting", () => {
  it("returns empty string for empty memory list", () => {
    expect(formatMemoriesAsContext([])).toBe("");
  });

  it("formats a single fact correctly", () => {
    const result = formatMemoriesAsContext([
      { fact: "Budget is $10,000", category: "budget" },
    ]);
    expect(result).toContain("## Known Information About This Prospect");
    expect(result).toContain("### Budget");
    expect(result).toContain("- Budget is $10,000");
  });

  it("capitalizes category names", () => {
    const result = formatMemoriesAsContext([
      { fact: "test", category: "timeline" },
    ]);
    expect(result).toContain("### Timeline");
    expect(result).not.toContain("### timeline");
  });

  it("groups multiple facts under the same category", () => {
    const result = formatMemoriesAsContext([
      { fact: "Budget is $10k", category: "budget" },
      { fact: "Needs approval for > $5k", category: "budget" },
    ]);

    // Should have only one ### Budget heading
    const headingCount = (result.match(/### Budget/g) || []).length;
    expect(headingCount).toBe(1);
    expect(result).toContain("- Budget is $10k");
    expect(result).toContain("- Needs approval for > $5k");
  });

  it("creates separate sections for different categories", () => {
    const result = formatMemoriesAsContext([
      { fact: "Budget is $10k", category: "budget" },
      { fact: "Need by Q2", category: "timeline" },
      { fact: "Wants Salesforce integration", category: "needs" },
    ]);

    expect(result).toContain("### Budget");
    expect(result).toContain("### Timeline");
    expect(result).toContain("### Needs");
  });

  it("handles all 6 category types", () => {
    const categories = ["budget", "timeline", "needs", "objection", "preference", "context"];
    const memories = categories.map((c) => ({ fact: `Fact for ${c}`, category: c }));

    const result = formatMemoriesAsContext(memories);

    for (const category of categories) {
      const capitalized = category.charAt(0).toUpperCase() + category.slice(1);
      expect(result).toContain(`### ${capitalized}`);
    }
  });

  it("starts with the correct header", () => {
    const result = formatMemoriesAsContext([
      { fact: "test", category: "budget" },
    ]);
    expect(result.startsWith("## Known Information About This Prospect\n")).toBe(true);
  });

  it("uses markdown bullet points for facts", () => {
    const result = formatMemoriesAsContext([
      { fact: "Fact one", category: "budget" },
      { fact: "Fact two", category: "budget" },
    ]);

    const lines = result.split("\n").filter((l) => l.startsWith("- "));
    expect(lines).toHaveLength(2);
  });
});
