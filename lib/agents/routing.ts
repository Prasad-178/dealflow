// Extracted pure routing logic from chat route for testability

export function shouldRerouteToDeal(
  agentType: string,
  status: string,
  responseText: string,
  toolCalls: { toolName: string; args?: Record<string, any> }[]
): boolean {
  if (agentType !== "qualifier" || status !== "completed") return false;

  const lower = responseText.toLowerCase();
  const hasPricingSignal =
    lower.includes("pricing") ||
    lower.includes("proposal") ||
    lower.includes("book a demo");

  const hasHotLead = toolCalls?.some(
    (tc) =>
      tc.toolName === "scoreLeadFit" &&
      tc.args &&
      tc.args.budget === "enterprise"
  );

  return !!(hasHotLead && hasPricingSignal);
}

export function resolveAgentType(agentType: string): string {
  const validTypes = ["knowledge", "qualifier", "deal", "scheduler"];
  return validTypes.includes(agentType) ? agentType : "knowledge";
}
