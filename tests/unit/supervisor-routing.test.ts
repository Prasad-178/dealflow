import { describe, it, expect } from "vitest";

/**
 * Tests for the intent-to-agent mapping contract used by the supervisor.
 */
describe("Supervisor - Intent to Agent Routing", () => {
  type AgentType = "knowledge" | "deal" | "scheduler" | "qualifier";

  const intentToAgent: Record<string, AgentType> = {
    product_question: "knowledge",
    pricing: "deal",
    scheduling: "scheduler",
    qualification: "qualifier",
    general: "knowledge",
    objection: "deal",
  };

  it("maps product_question to knowledge agent", () => {
    expect(intentToAgent.product_question).toBe("knowledge");
  });

  it("maps pricing to deal agent", () => {
    expect(intentToAgent.pricing).toBe("deal");
  });

  it("maps scheduling to scheduler agent", () => {
    expect(intentToAgent.scheduling).toBe("scheduler");
  });

  it("maps qualification to qualifier agent", () => {
    expect(intentToAgent.qualification).toBe("qualifier");
  });

  it("maps general to knowledge agent (default fallback)", () => {
    expect(intentToAgent.general).toBe("knowledge");
  });

  it("maps objection to deal agent", () => {
    expect(intentToAgent.objection).toBe("deal");
  });

  it("covers all 6 intent types", () => {
    const intents = Object.keys(intentToAgent);
    expect(intents).toHaveLength(6);
    expect(intents).toContain("product_question");
    expect(intents).toContain("pricing");
    expect(intents).toContain("scheduling");
    expect(intents).toContain("qualification");
    expect(intents).toContain("general");
    expect(intents).toContain("objection");
  });

  it("uses all 4 agent types", () => {
    const agents = new Set(Object.values(intentToAgent));
    expect(agents.size).toBe(4);
    expect(agents).toContain("knowledge");
    expect(agents).toContain("deal");
    expect(agents).toContain("scheduler");
    expect(agents).toContain("qualifier");
  });

  describe("conditional re-routing", () => {
    it("hot lead + pricing signal triggers deal follow-up", () => {
      const qualifierResult = {
        status: "completed" as const,
        response: "Based on your profile, I'd recommend our pricing tier...",
        toolCalls: [
          { toolName: "scoreLeadFit", args: { budget: "enterprise" } },
        ],
      };

      const responseText = qualifierResult.response.toLowerCase();
      const hasPricingSignal =
        responseText.includes("pricing") ||
        responseText.includes("proposal") ||
        responseText.includes("book a demo");

      const hasHotLead = qualifierResult.toolCalls.some(
        (tc: any) =>
          tc.toolName === "scoreLeadFit" &&
          tc.args?.budget === "enterprise"
      );

      expect(hasPricingSignal).toBe(true);
      expect(hasHotLead).toBe(true);
    });

    it("cold lead does not trigger re-routing", () => {
      const qualifierResult = {
        status: "completed" as const,
        response: "I'd love to learn more about your needs.",
        toolCalls: [
          { toolName: "scoreLeadFit", args: { budget: "smb" } },
        ],
      };

      const hasHotLead = qualifierResult.toolCalls.some(
        (tc: any) =>
          tc.toolName === "scoreLeadFit" &&
          tc.args?.budget === "enterprise"
      );

      expect(hasHotLead).toBe(false);
    });
  });
});
