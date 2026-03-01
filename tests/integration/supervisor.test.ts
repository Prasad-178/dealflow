import { describe, it, expect, beforeAll } from "vitest";

const hasOpenAI = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasOpenAI)("Supervisor Agent (Integration)", () => {
  let classifyIntent: typeof import("@/lib/agents/supervisor").classifyIntent;

  beforeAll(async () => {
    const mod = await import("@/lib/agents/supervisor");
    classifyIntent = mod.classifyIntent;
  });

  it("classifies product question correctly", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "What CRM integrations do you support?" },
    ]);

    expect(intent.intent).toBe("product_question");
    expect(agent).toBe("knowledge");
    expect(intent.confidence).toBeGreaterThan(0.5);
  });

  it("classifies pricing intent correctly", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "How much does your Enterprise plan cost?" },
    ]);

    expect(intent.intent).toBe("pricing");
    expect(agent).toBe("deal");
  });

  it("classifies scheduling intent correctly", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "Can we schedule a demo for next week?" },
    ]);

    expect(intent.intent).toBe("scheduling");
    expect(agent).toBe("scheduler");
  });

  it("classifies qualification info correctly", async () => {
    const { intent, agent } = await classifyIntent([
      {
        role: "user",
        content:
          "We're a 200-person fintech company. I'm the VP of Sales and we need a solution this quarter. Budget is around $10k/year.",
      },
    ]);

    expect(intent.intent).toBe("qualification");
    expect(agent).toBe("qualifier");
  });

  it("classifies greeting as general", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "Hi there!" },
    ]);

    expect(intent.intent).toBe("general");
    expect(agent).toBe("knowledge");
  });

  it("classifies objection correctly", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "Your product is too expensive compared to CompetitorX" },
    ]);

    expect(["objection", "pricing"]).toContain(intent.intent);
    expect(agent).toBe("deal");
  });

  it("handles multi-turn context", async () => {
    const { intent, agent } = await classifyIntent([
      { role: "user", content: "Tell me about your product" },
      { role: "assistant", content: "We offer an AI-powered sales automation platform..." },
      { role: "user", content: "Great, how much does it cost?" },
    ]);

    expect(intent.intent).toBe("pricing");
    expect(agent).toBe("deal");
  });
});
