import { describe, it, expect } from "vitest";
import { createStreamGuard } from "@/lib/guardrails/stream-guard";

describe("Stream Guard", () => {
  it("passes through clean chunks", async () => {
    const guard = createStreamGuard();
    const reader = guard.readable.getReader();
    const writer = guard.writable.getWriter();

    await writer.write("Hello, how can I ");
    await writer.write("help you today?");
    await writer.close();

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    expect(chunks.join("")).toBe("Hello, how can I help you today?");
  });

  it("halts stream on confidential info violation", async () => {
    const guard = createStreamGuard();
    const reader = guard.readable.getReader();
    const writer = guard.writable.getWriter();

    await writer.write("Our ");
    await writer.write("internal pricing margin is 80%");
    // Stream should be terminated by guard

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const output = chunks.join("");
    // Should contain the fallback response, not the original confidential content
    expect(output).not.toContain("80%");
  });
});
