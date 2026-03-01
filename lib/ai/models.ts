import { openai } from "@ai-sdk/openai";

// Main routing/supervisor model - fast, cheap, structured output
export const supervisorModel = openai("gpt-4o-mini");

// Agent model - more capable for complex reasoning
export const agentModel = openai("gpt-4o-mini");

// Embedding model
export const embeddingModel = openai.embedding("text-embedding-3-small");

// Guardrail check model - fast
export const guardrailModel = openai("gpt-4o-mini");

// Memory extraction model
export const memoryModel = openai("gpt-4o-mini");
