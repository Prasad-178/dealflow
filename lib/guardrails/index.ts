import { checkDeterministicRules } from "./deterministic";
import { checkSemanticSimilarity } from "./semantic";
import { checkWithLLM } from "./llm-check";
import { getFallbackResponse } from "./fallbacks";

export type GuardrailResult = {
  passed: boolean;
  violation?: {
    layer: "deterministic" | "semantic" | "llm";
    category: string;
    details: string;
  };
  fallbackResponse?: string;
};

export async function runGuardrails(
  content: string,
  companyId: string,
  direction: "input" | "output"
): Promise<GuardrailResult> {
  // Layer 1: Deterministic rules (fastest)
  const deterministicResult = checkDeterministicRules(content);
  if (!deterministicResult.passed) {
    return {
      passed: false,
      violation: {
        layer: "deterministic",
        category: deterministicResult.category!,
        details: deterministicResult.details!,
      },
      fallbackResponse: getFallbackResponse(deterministicResult.category!),
    };
  }

  // Layer 2: Semantic similarity check
  const semanticResult = await checkSemanticSimilarity(content, companyId);
  if (!semanticResult.passed) {
    return {
      passed: false,
      violation: {
        layer: "semantic",
        category: semanticResult.category!,
        details: semanticResult.details!,
      },
      fallbackResponse: getFallbackResponse(semanticResult.category!),
    };
  }

  // Layer 3: LLM check (only for output, most expensive)
  if (direction === "output") {
    const llmResult = await checkWithLLM(content);
    if (!llmResult.passed) {
      return {
        passed: false,
        violation: {
          layer: "llm",
          category: llmResult.category!,
          details: llmResult.details!,
        },
        fallbackResponse: getFallbackResponse(llmResult.category!),
      };
    }
  }

  return { passed: true };
}
