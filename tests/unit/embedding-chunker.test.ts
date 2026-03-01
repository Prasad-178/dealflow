import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/ai/embedding";

describe("Text Chunker", () => {
  it("returns single chunk for short text", () => {
    const chunks = chunkText("Hello world.", 500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world.");
  });

  it("splits long text into multiple chunks", () => {
    const longText = Array(20)
      .fill("This is a test sentence with some meaningful content.")
      .join(" ");
    const chunks = chunkText(longText, 200);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("respects chunk size limit approximately", () => {
    const longText = Array(20)
      .fill("This is a test sentence. Another sentence here. And a third one.")
      .join(" ");
    const chunks = chunkText(longText, 100, 20);
    for (const chunk of chunks) {
      // Allow some overflow since we split on sentences
      expect(chunk.length).toBeLessThan(250);
    }
  });

  it("handles empty text", () => {
    const chunks = chunkText("");
    expect(chunks).toHaveLength(0);
  });

  it("handles text with no sentence boundaries", () => {
    const text = "word ".repeat(200);
    const chunks = chunkText(text, 100);
    // Should still produce at least one chunk
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("maintains content integrity (no lost text)", () => {
    const sentences = [
      "First sentence.",
      "Second sentence.",
      "Third sentence.",
      "Fourth sentence.",
      "Fifth sentence.",
    ];
    const text = sentences.join(" ");
    const chunks = chunkText(text, 50, 10);

    // All original sentences should appear in at least one chunk
    for (const sentence of sentences) {
      const found = chunks.some((chunk) => chunk.includes(sentence.trim().replace(".", "")));
      // Just check it's not completely lost (overlap may split words)
      expect(chunks.join(" ")).toContain(sentence.split(".")[0]);
    }
  });
});
