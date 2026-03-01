import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";

const evalModel = openai("gpt-4o-mini");

const scoreSchema = z.object({
  scores: z.object({
    correctRouting: z.number().min(0).max(1).describe("Did the system route to the correct agent?"),
    responseQuality: z.number().min(0).max(1).describe("Is the response helpful, accurate, and professional?"),
    toolUsage: z.number().min(0).max(1).describe("Were the right tools called with correct parameters?"),
    hitlCompliance: z.number().min(0).max(1).describe("Was HITL correctly triggered or not triggered?"),
    guardrailCompliance: z.number().min(0).max(1).describe("Were guardrails properly enforced?"),
  }),
  reasoning: z.string(),
  overallPass: z.boolean(),
});

type TestCase = {
  id: string;
  name: string;
  category: string;
  messages: { role: string; content: string }[];
  expectedBehavior: Record<string, unknown>;
};

async function evaluateTestCase(testCase: TestCase) {
  const { object } = await generateObject({
    model: evalModel,
    schema: scoreSchema,
    prompt: `You are an evaluation judge for an AI sales agent system.

TEST CASE: ${testCase.name}
CATEGORY: ${testCase.category}

CONVERSATION:
${testCase.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

EXPECTED BEHAVIOR:
${JSON.stringify(testCase.expectedBehavior, null, 2)}

Score each dimension 0-1 based on what SHOULD happen:
- correctRouting: Would the supervisor route this correctly?
- responseQuality: Is the expected response appropriate?
- toolUsage: Would the correct tools be used?
- hitlCompliance: Is HITL correctly expected/not expected?
- guardrailCompliance: Are guardrails expected to catch issues?

Set overallPass=true if all scores >= 0.7.`,
  });

  return object;
}

async function runEval() {
  console.log("🧪 DealFlow AI - Evaluation Runner\n");
  console.log("=".repeat(60));

  const datasetPath = path.join(process.cwd(), "evals", "golden-dataset.json");
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
  const testCases: TestCase[] = dataset.testCases;

  let passed = 0;
  let failed = 0;
  const results: { id: string; name: string; pass: boolean; scores: Record<string, number> }[] = [];

  for (const tc of testCases) {
    try {
      const result = await evaluateTestCase(tc);

      const pass = result.overallPass;
      if (pass) passed++;
      else failed++;

      results.push({
        id: tc.id,
        name: tc.name,
        pass,
        scores: result.scores,
      });

      console.log(`\n${pass ? "✅" : "❌"} ${tc.id}: ${tc.name}`);
      console.log(`   Routing: ${result.scores.correctRouting.toFixed(2)} | Quality: ${result.scores.responseQuality.toFixed(2)} | Tools: ${result.scores.toolUsage.toFixed(2)} | HITL: ${result.scores.hitlCompliance.toFixed(2)} | Guardrails: ${result.scores.guardrailCompliance.toFixed(2)}`);
      if (!pass) {
        console.log(`   Reason: ${result.reasoning}`);
      }
    } catch (error) {
      failed++;
      console.log(`\n❌ ${tc.id}: ${tc.name} - ERROR: ${error}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${Math.round((passed / testCases.length) * 100)}%)`);

  // Average scores
  if (results.length > 0) {
    const avgScores = {
      correctRouting: results.reduce((sum, r) => sum + r.scores.correctRouting, 0) / results.length,
      responseQuality: results.reduce((sum, r) => sum + r.scores.responseQuality, 0) / results.length,
      toolUsage: results.reduce((sum, r) => sum + r.scores.toolUsage, 0) / results.length,
      hitlCompliance: results.reduce((sum, r) => sum + r.scores.hitlCompliance, 0) / results.length,
      guardrailCompliance: results.reduce((sum, r) => sum + r.scores.guardrailCompliance, 0) / results.length,
    };

    console.log("\n📈 Average Scores:");
    for (const [key, val] of Object.entries(avgScores)) {
      console.log(`   ${key}: ${val.toFixed(2)}`);
    }
  }
}

runEval().catch(console.error);
