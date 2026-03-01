import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const evalModel = openai("gpt-4o-mini");

const ragTriadSchema = z.object({
  contextRelevance: z
    .number()
    .min(0)
    .max(1)
    .describe("How relevant is the retrieved context to the question?"),
  faithfulness: z
    .number()
    .min(0)
    .max(1)
    .describe("Is the answer faithful to the retrieved context (no hallucinations)?"),
  answerRelevance: z
    .number()
    .min(0)
    .max(1)
    .describe("How relevant and helpful is the answer to the original question?"),
  reasoning: z.string(),
});

type RAGTestCase = {
  question: string;
  retrievedContext: string;
  generatedAnswer: string;
};

const RAG_TEST_CASES: RAGTestCase[] = [
  {
    question: "What CRM integrations does DealFlow Pro support?",
    retrievedContext:
      "CRM Integration: DealFlow Pro offers native integrations with Salesforce, HubSpot, and Pipedrive. Setup takes under 15 minutes. All lead data, scores, and conversation history sync bi-directionally in real-time.",
    generatedAnswer:
      "DealFlow Pro natively integrates with Salesforce, HubSpot, and Pipedrive. The setup process takes less than 15 minutes, and all your data syncs bi-directionally in real-time.",
  },
  {
    question: "How much does the Enterprise plan cost?",
    retrievedContext:
      "Pricing: Enterprise plan at $499/month offers unlimited leads, custom AI models, API access, dedicated CSM, and SLA guarantee. Annual billing saves 20%.",
    generatedAnswer:
      "The Enterprise plan is $499/month, which includes unlimited leads, custom AI models, full API access, a dedicated Customer Success Manager, and SLA guarantee. You can save 20% with annual billing.",
  },
  {
    question: "What security certifications do you have?",
    retrievedContext:
      "Security & Compliance: DealFlow Pro is SOC 2 Type II certified and GDPR compliant. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Enterprise plans include SSO via SAML 2.0.",
    generatedAnswer:
      "DealFlow Pro is SOC 2 Type II certified and GDPR compliant. We use AES-256 encryption at rest and TLS 1.3 in transit. Enterprise plans also include SSO via SAML 2.0 and SCIM provisioning.",
  },
];

async function evaluateRAGTriad(testCase: RAGTestCase) {
  const { object } = await generateObject({
    model: evalModel,
    schema: ragTriadSchema,
    prompt: `Evaluate this RAG (Retrieval-Augmented Generation) interaction using the RAG Triad metrics.

QUESTION: ${testCase.question}

RETRIEVED CONTEXT: ${testCase.retrievedContext}

GENERATED ANSWER: ${testCase.generatedAnswer}

Score each metric 0-1:
1. Context Relevance: Is the retrieved context relevant to the question?
2. Faithfulness: Does the answer only contain information from the context (no hallucinations)?
3. Answer Relevance: Is the answer helpful and directly addresses the question?`,
  });

  return object;
}

async function runRAGEval() {
  console.log("🔍 DealFlow AI - RAG Triad Evaluation\n");
  console.log("=".repeat(60));

  const results = [];

  for (let i = 0; i < RAG_TEST_CASES.length; i++) {
    const tc = RAG_TEST_CASES[i];
    console.log(`\n📝 Test ${i + 1}: "${tc.question}"`);

    try {
      const result = await evaluateRAGTriad(tc);
      results.push(result);

      console.log(`   Context Relevance: ${result.contextRelevance.toFixed(2)}`);
      console.log(`   Faithfulness:      ${result.faithfulness.toFixed(2)}`);
      console.log(`   Answer Relevance:  ${result.answerRelevance.toFixed(2)}`);

      const avg =
        (result.contextRelevance + result.faithfulness + result.answerRelevance) / 3;
      console.log(`   Average:           ${avg.toFixed(2)} ${avg >= 0.8 ? "✅" : "⚠️"}`);
    } catch (error) {
      console.log(`   ERROR: ${error}`);
    }
  }

  if (results.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Overall RAG Triad Scores:");
    const avgContext = results.reduce((s, r) => s + r.contextRelevance, 0) / results.length;
    const avgFaith = results.reduce((s, r) => s + r.faithfulness, 0) / results.length;
    const avgAnswer = results.reduce((s, r) => s + r.answerRelevance, 0) / results.length;

    console.log(`   Context Relevance: ${avgContext.toFixed(2)}`);
    console.log(`   Faithfulness:      ${avgFaith.toFixed(2)}`);
    console.log(`   Answer Relevance:  ${avgAnswer.toFixed(2)}`);
    console.log(`   Overall:           ${((avgContext + avgFaith + avgAnswer) / 3).toFixed(2)}`);
  }
}

runRAGEval().catch(console.error);
