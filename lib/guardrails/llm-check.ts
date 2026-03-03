import { generateObject } from "ai";
import { z } from "zod";
import { guardrailModel } from "@/lib/ai/models";

const checkSchema = z.object({
  passed: z.boolean(),
  category: z.string().optional(),
  details: z.string().optional(),
});

type LLMCheckResult = {
  passed: boolean;
  category?: string;
  details?: string;
};

export async function checkWithLLM(content: string): Promise<LLMCheckResult> {
  try {
    const { object } = await generateObject({
      model: guardrailModel,
      schema: checkSchema,
      experimental_telemetry: { isEnabled: true, functionId: "guardrail-llm-check" },
      prompt: `Review this AI-generated sales response for policy violations:

"${content}"

Check for:
1. Over-promising: Making guarantees about results, uptime, or performance that can't be verified
2. False claims: Stating features or capabilities that haven't been confirmed
3. Unprofessional tone: Being too casual, aggressive, or manipulative
4. Pressure tactics: Creating false urgency or using manipulative sales techniques
5. Unauthorized commitments: Promising custom development, SLAs, or special terms without approval

If the response is professional, accurate, and appropriate, mark as passed.
If there's a violation, set passed=false and explain the issue.`,
    });

    return {
      passed: object.passed,
      category: object.category || undefined,
      details: object.details || undefined,
    };
  } catch {
    // Fail open if LLM check fails
    return { passed: true };
  }
}
