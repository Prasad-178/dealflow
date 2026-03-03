# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DealFlow AI — a multi-agent platform for autonomous business development. Prospects interact via chat widget, email, Slack, or Telegram. A supervisor agent classifies intent and routes to specialized sub-agents (Knowledge, Qualifier, Deal, Scheduler). All responses pass through a 3-layer guardrail pipeline. Background processing is handled by Inngest.

## Common Commands

```bash
# Development
npm run dev                    # Next.js dev server with Turbopack
npm run build                  # Production build

# Database (PostgreSQL 16 + pgvector via Docker on port 5433)
docker compose up -d           # Start pgvector container
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Run migrations
npm run db:push                # Push schema directly (dev)
npm run db:studio              # Drizzle Studio GUI
npm run seed                   # Seed demo company + prospects + docs

# Testing (Vitest)
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:unit              # Unit tests only (no external deps)
npm run test:integration       # Needs DB + OpenAI
npm run test:e2e               # Full flow tests
npx vitest run tests/unit/agent-qualifier.test.ts  # Single test file

# Evaluation
npm run eval                   # LLM-as-Judge against golden dataset
npm run eval:rag               # RAG Triad metrics

# Other
npm run lint                   # ESLint
npm run mcp:server             # Standalone MCP server
```

## Architecture

### Agent Orchestration
`lib/agents/supervisor.ts` classifies intent via `classifyIntent()` → routes to sub-agent:
- **Knowledge** (`lib/agents/knowledge.ts`) — RAG-based product Q&A
- **Qualifier** (`lib/agents/qualifier.ts`) — BANT lead scoring + tagging
- **Deal** (`lib/agents/deal.ts`) — Pricing, proposals, discounts (HITL for >10% discount or proposals)
- **Scheduler** (`lib/agents/scheduler.ts`) — Meeting booking via Google Calendar

Conditional re-routing: hot leads with pricing signals go through both Qualifier and Deal.

### Webhook Pipeline (Inngest — 16 checkpointed steps)
`POST /api/webhooks/[platform]` → queue in DB → fire Inngest event → background pipeline in `lib/inngest/functions.ts`:
Verify → parse → resolve company → get/create prospect & conversation → store message → input guardrails → retrieve memories → classify intent → run agent → output guardrails → store reply → send outbound → extract memories.

### Guardrails (3 layers in `lib/guardrails/`)
1. **Deterministic** — regex rules (<1ms)
2. **Semantic** — pgvector similarity against `banned_concepts` table (threshold 0.85)
3. **LLM Check** — post-generation validation for over-promising, false claims, pressure tactics

Applied on both input and output. Streaming guard via `TransformStream` in `stream-guard.ts`.

### Memory System (`lib/memory/`)
Extract facts via LLM → store with pgvector embeddings → retrieve via semantic search → inject into agent system prompt. LLM "Judge" resolves contradictions before consolidating.

### Integrations (`lib/integrations/`)
All optional with graceful fallbacks. Parsers produce `NormalizedMessage`. Outbound dispatch via `sendOutboundMessage()`.

### Key API Routes
- `POST /api/chat` — Main chat endpoint (supervisor → agents)
- `POST /api/webhooks/[platform]` — Webhook ingestion (email/slack/telegram/widget/api)
- `PATCH /api/approvals/[id]` — HITL approval (creates calendar event + sends confirmation)
- `POST /api/inngest` — Inngest serve endpoint

## Code Conventions

- **Path alias:** `@/*` maps to project root
- **Agent functions:** `run{AgentName}Agent()` pattern
- **LLM outputs:** Zod schemas with `generateObject()` from Vercel AI SDK
- **Models:** All defined in `lib/ai/models.ts` (gpt-4o-mini for agents, text-embedding-3-small for embeddings)
- **DB:** Drizzle ORM with lazy Proxy initialization (avoids build-time DATABASE_URL check). Schema in `lib/db/schema/`
- **Testing:** Pure logic extracted from agents for unit testability. Unit tests mock nothing external. Integration/e2e tests need DB + OpenAI.
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

## Tech Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind + shadcn/ui · Drizzle ORM · PostgreSQL 16 + pgvector · Vercel AI SDK (`ai@4.1`) · Inngest · Vitest
