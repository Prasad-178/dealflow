import { checkDeterministicRules } from "./deterministic";
import { getFallbackResponse } from "./fallbacks";

export function createStreamGuard() {
  let accumulated = "";

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      accumulated += chunk;

      // Check deterministic rules on accumulated text
      const result = checkDeterministicRules(accumulated);

      if (!result.passed) {
        // Replace the entire stream with a fallback
        controller.enqueue(getFallbackResponse(result.category!));
        controller.terminate();
        return;
      }

      controller.enqueue(chunk);
    },
  });
}
