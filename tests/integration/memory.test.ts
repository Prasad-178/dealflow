import { describe, it, expect, beforeAll } from "vitest";

const hasOpenAI = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasOpenAI)("Memory Extraction (Integration)", () => {
  let extractFactsFromMessages: any;

  beforeAll(async () => {
    // Import the generateObject function directly to test extraction logic
    // without needing DB writes
    const { generateObject } = await import("ai");
    const { z } = await import("zod");
    const { memoryModel } = await import("@/lib/ai/models");

    const factsSchema = z.object({
      facts: z.array(
        z.object({
          fact: z.string(),
          category: z.enum(["budget", "timeline", "needs", "objection", "preference", "context"]),
          confidence: z.number().min(0).max(1),
        })
      ),
    });

    extractFactsFromMessages = async (msgs: { role: string; content: string }[]) => {
      const { object } = await generateObject({
        model: memoryModel,
        schema: factsSchema,
        system: `You are a fact extraction specialist. Extract specific, actionable facts about the prospect from this conversation.

Focus on:
- Budget information (specific numbers, ranges, constraints)
- Timeline (when they need a solution, urgency)
- Needs (specific problems, requirements, use cases)
- Objections (concerns, hesitations, blockers)
- Preferences (preferred features, communication style, decision process)
- Context (company size, industry, role, current tools)

Rules:
- Only extract facts that are explicitly stated or strongly implied
- Each fact should be a single, specific piece of information
- Set confidence based on how explicitly stated the fact is
- Do NOT extract generic or obvious information`,
        messages: msgs.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });
      return object.facts;
    };
  });

  it("extracts budget information", async () => {
    const facts = await extractFactsFromMessages([
      { role: "user", content: "Our budget for this year is about $10,000 for sales tools." },
    ]);

    const budgetFact = facts.find((f: any) => f.category === "budget");
    expect(budgetFact).toBeTruthy();
    expect(budgetFact.fact).toContain("10,000");
    expect(budgetFact.confidence).toBeGreaterThan(0.7);
  });

  it("extracts timeline information", async () => {
    const facts = await extractFactsFromMessages([
      { role: "user", content: "We need to have something in place by end of Q2." },
    ]);

    const timelineFact = facts.find((f: any) => f.category === "timeline");
    expect(timelineFact).toBeTruthy();
    expect(timelineFact.confidence).toBeGreaterThan(0.5);
  });

  it("extracts company context from rich conversation", async () => {
    const facts = await extractFactsFromMessages([
      { role: "user", content: "Hi, I'm the CRO at a 300-person fintech company. We have a team of 25 sales reps." },
      { role: "assistant", content: "Great to meet you! What challenges are you facing with your current sales process?" },
      { role: "user", content: "We spend too much time on manual lead qualification. We need something that integrates with Salesforce." },
    ]);

    expect(facts.length).toBeGreaterThanOrEqual(2);
    const categories = facts.map((f: any) => f.category);
    expect(categories).toContain("context");
    expect(categories).toContain("needs");
  });

  it("handles empty/minimal conversation", async () => {
    const facts = await extractFactsFromMessages([
      { role: "user", content: "Hello" },
    ]);

    // Should extract few or no facts from a simple greeting
    expect(facts.length).toBeLessThanOrEqual(1);
  });
});
