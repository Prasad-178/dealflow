import { describe, it, expect } from "vitest";
import { createStreamGuard } from "@/lib/guardrails/stream-guard";

describe("Stream Guard", () => {
  it("passes through clean chunks", async () => {
    const guard = createStreamGuard();
    const writer = guard.writable.getWriter();
    const reader = guard.readable.getReader();

    // Write and close in background
    const writePromise = (async () => {
      await writer.write("Hello, how can I ");
      await writer.write("help you today?");
      await writer.close();
    })();

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    await writePromise;
    expect(chunks.join("")).toBe("Hello, how can I help you today?");
  });

  it("halts stream on confidential info violation", async () => {
    const guard = createStreamGuard();
    const writer = guard.writable.getWriter();
    const reader = guard.readable.getReader();

    // Write in background - the second chunk triggers the guard
    const writePromise = (async () => {
      try {
        await writer.write("Our ");
        await writer.write("internal pricing margin is 80%");
        await writer.close();
      } catch {
        // Writer may error when stream is terminated by guard - that's expected
      }
    })();

    const chunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    await writePromise;
    const output = chunks.join("");
    // Should contain the fallback response, not the original confidential content
    expect(output).not.toContain("80%");
  });
});
