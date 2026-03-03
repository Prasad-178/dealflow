# DealFlow AI

> Multi-agent AI platform for autonomous business development — qualifies leads, answers product questions via RAG, negotiates deals, and books meetings, all with human-in-the-loop approval for high-stakes actions.

Built to demonstrate all 7 modules of advanced agentic AI architecture: messaging & webhooks, state management & concurrency, advanced tool calling, memory systems, multi-agent orchestration, guardrails (trust layer), and evaluation.

## Architecture

```
Prospect (Chat Widget)  →  /api/chat  →  Guardrails (Pre)  →  Supervisor Agent
                                                                    ↓
                                             ┌────────────┬────────────┬────────────┐
                                        QualifierAgent  DealAgent  SchedulerAgent  KnowledgeAgent
                                             └────────────┴────────────┴────────────┘
                                                                    ↓
                                                          Guardrails (Post)  →  Response
                                                                    ↓
                                                      Background: Memory Extraction
```

### The 4 Agents

| Agent | Purpose | Tools | HITL? |
|-------|---------|-------|-------|
| **QualifierAgent** | BANT-based lead qualification | `scoreLeadFit`, `getCompanyInfo`, `tagLead` | No |
| **KnowledgeAgent** | RAG over product docs & FAQs | `searchKnowledgeBase`, `getCaseStudy` | No |
| **DealAgent** | Pricing, negotiation, proposals | `getPricing`, `draftProposal`, `applyDiscount` | Yes — proposals always, discounts >10% |
| **SchedulerAgent** | Demo & meeting booking | `checkAvailability`, `bookMeeting` | Yes — always |

### How the 7 Modules Map

| Module | Implementation |
|--------|---------------|
| **1. Messaging & Webhooks** | `/api/webhooks/[platform]` — accepts webhooks, returns 200 immediately, queues for background processing via Inngest |
| **2. State Management** | Conversation `status` (idle/processing/cancelled) + `activeJobId` with AbortController for interrupt/kill/restart |
| **3. Tool Calling** | ~12 tools with Zod schemas across 4 agents + MCP server with tools & resources |
| **4. Memory** | Extract facts → embed → store in pgvector → semantic retrieval → inject into context. LLM judge for contradiction resolution |
| **5. Multi-Agent** | Supervisor classifies intent via structured output → routes to sub-agent. Conditional re-routing (qualifier → deal for hot leads) |
| **6. Guardrails** | 3-layer pipeline: deterministic regex → semantic similarity (pgvector) → LLM post-check. TransformStream guard for real-time filtering |
| **7. Evaluation** | Golden dataset (10 test cases) + LLM-as-Judge scorer + RAG Triad metrics |

## Platform Integrations

Prospects can reach the agent from **any channel** — the async webhook pipeline processes messages identically regardless of source.

| Platform | Inbound | Outbound | Verification |
|----------|---------|----------|-------------|
| **Email** (Resend) | Webhook → `parseEmailPayload` | `sendEmail` with In-Reply-To threading | Trusted relay |
| **Slack** (Web API + MCP) | Events API → `parseSlackPayload` | `chat.postMessage` with thread support | HMAC-SHA256 + 5-min replay guard |
| **Telegram** (Bot API) | Webhook → `parseTelegramPayload` | `/sendMessage` via fetch | Secret token header |
| **Google Calendar** | — | `createCalendarEvent` with auto Meet link | Service account JWT |
| **Widget** | Direct POST | Inline response | Same-origin |

All integrations are **optional** — the app works fully without any external API keys configured (graceful fallbacks everywhere).

### Async Webhook Pipeline (Inngest)

```
Inbound webhook → verify signature → queue in DB → fire Inngest event → return 200 OK
                                                          ↓
Inngest Worker (16 checkpointed steps):
  Parse payload → Get/create prospect → Create conversation → Store message
  → Input guardrails → Retrieve memories → Classify intent → Run agent
  → Output guardrails → Store reply → Send outbound message → Mark completed
  → Emit memory extraction event
```

## Authentication

NextAuth.js v5 with credentials provider and JWT strategy. Protected routes:
- All `/dashboard/*` pages require login
- All `/api/*` routes (except webhooks, inngest, auth, and chat) are session-protected
- API routes scope queries to the user's `companyId`

**Demo credentials**: `demo@dealflow.ai` / `password123` (created by `npm run seed`)

## Observability

### Telemetry (Langfuse + OpenTelemetry)

All LLM calls are traced via Langfuse with descriptive `functionId` labels:
- `supervisor-classify`, `qualifier-agent`, `deal-agent`, `scheduler-agent`, `knowledge-agent`
- `guardrail-llm-check`, `memory-extract`, `memory-consolidate`
- `embed-single`, `embed-batch`

### Structured Logging

JSON-formatted logs with module context across all API routes, integrations, and Inngest functions.

### Rate Limiting

Sliding-window in-memory rate limiter:
- `/api/chat`: 20 requests/min per IP
- `/api/webhooks/[platform]`: 60 requests/min per IP

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs and pushes to `main`:
- Checkout → Node.js 20 → `npm ci` → `npm run lint` → `npm run test:unit`

## Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **Vercel AI SDK v4** (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- **NextAuth.js v5** (credentials + JWT)
- **PostgreSQL 16** + **pgvector** (local Docker)
- **Drizzle ORM** for type-safe DB
- **Langfuse** + **OpenTelemetry** for LLM tracing
- **MCP** (Model Context Protocol) — local server + Slack MCP
- **Inngest** for background job processing (16-step pipeline)
- **Resend** for email (inbound/outbound)
- **Slack Web API** + **Slack MCP** for workspace integration
- **Telegram Bot API** for messaging
- **Google Calendar API** for real availability + meeting creation
- **Vitest** for testing (250 unit tests)
- **shadcn/ui** + **Tailwind CSS**
- **GitHub Actions** for CI

## Quick Start

### Prerequisites

- Node.js 18+
- Docker
- OpenAI API key

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd agentic-realfy
npm install

# 2. Start local Postgres with pgvector
docker compose up -d

# 3. Create your .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY and NEXTAUTH_SECRET

# 4. Push database schema
npm run db:push

# 5. Enable pgvector extension (first time only)
docker exec dealflow-db psql -U dealflow -d dealflow -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 6. Seed demo data
npm run seed

# 7. Start the app
npm run dev
```

The app runs at `http://localhost:3000`. Login at `/login` with `demo@dealflow.ai` / `password123`.

### Database

Local Docker Postgres with pgvector on port **5433** (to avoid conflicts with existing local Postgres).

```bash
docker compose up -d    # Start
docker compose down     # Stop
docker compose down -v  # Stop + delete data
```

## Project Structure

```
app/
  page.tsx                              # Landing page
  login/page.tsx                        # Login page (NextAuth credentials)
  (dashboard)/dashboard/
    page.tsx                            # Sales rep dashboard (real DB data)
    approvals/page.tsx                  # HITL approval queue (real DB data)
    leads/page.tsx                      # Lead pipeline (search/sort/pagination)
    knowledge/page.tsx                  # Knowledge base management (CRUD)
    settings/page.tsx                   # Guardrail config (persistent)
  (chat)/chat/[companyId]/page.tsx      # Prospect-facing chat widget
  api/
    auth/[...nextauth]/route.ts         # NextAuth API handler
    chat/route.ts                       # Main chat endpoint (auth + rate limit)
    webhooks/[platform]/route.ts        # Webhook ingestion (rate limited)
    approvals/route.ts                  # List approvals
    approvals/[id]/route.ts             # HITL approval API
    dashboard/stats/route.ts            # Dashboard stats
    dashboard/leads/route.ts            # Leads list with search/sort
    dashboard/knowledge/route.ts        # Knowledge entries
    settings/route.ts                   # Guardrail config GET/PATCH
    knowledge/route.ts                  # Knowledge upload (chunk + embed)
    knowledge/[id]/route.ts             # Knowledge delete
    inngest/route.ts                    # Inngest serve endpoint
lib/
  auth.ts                               # NextAuth config (credentials + JWT)
  rate-limit.ts                          # Sliding-window rate limiter
  logger.ts                              # Structured JSON logger
  agents/
    supervisor.ts                       # Intent classification + routing
    qualifier.ts                        # Lead qualification (BANT)
    deal.ts                             # Pricing + negotiation
    scheduler.ts                        # Meeting booking (real Google Calendar)
    knowledge.ts                        # RAG Q&A
  ai/
    models.ts                           # Model configs (GPT-4o-mini)
    embedding.ts                        # Embedding + chunking utilities
  db/
    index.ts                            # Drizzle client (postgres.js)
    schema/                             # 11 table schemas with pgvector
  guardrails/
    index.ts                            # 3-layer pipeline orchestrator
    deterministic.ts                    # Regex rules
    semantic.ts                         # Vector similarity filtering
    llm-check.ts                        # LLM post-generation check
    stream-guard.ts                     # TransformStream real-time guard
    fallbacks.ts                        # Safe fallback responses
  integrations/
    types.ts                            # NormalizedMessage, ReplyTarget, OutboundMessage
    email.ts                            # Resend: parse, send, meeting confirmations
    slack.ts                            # Slack Web API: verify, parse, send
    slack-mcp.ts                        # Slack MCP server config (OAuth + Streamable HTTP)
    telegram.ts                         # Telegram Bot API: verify, parse, send
    calendar.ts                         # Google Calendar: availability + event creation
    outbound.ts                         # Platform dispatcher (routes to correct sender)
  memory/
    extract.ts                          # LLM fact extraction
    consolidate.ts                      # LLM judge for contradictions
    retrieve.ts                         # Semantic retrieval + injection
  mcp/
    server.ts                           # Standalone MCP server (DB-backed)
    client.ts                           # MCP client (stdio transport)
  inngest/
    client.ts                           # Inngest client
    functions.ts                        # 16-step webhook pipeline + memory extraction
middleware.ts                            # Auth middleware (protects dashboard + API)
instrumentation.ts                       # Langfuse + OpenTelemetry setup
next-auth.d.ts                           # NextAuth session type extensions
scripts/
  seed.ts                               # Seed demo data (idempotent user creation)
  eval.ts                               # LLM-as-Judge evaluation
  eval-rag.ts                           # RAG Triad evaluation
evals/
  golden-dataset.json                   # 10 test scenarios
tests/
  unit/                                 # Unit tests (no external deps)
  integration/                          # Integration tests (DB + OpenAI)
  e2e/                                  # End-to-end flow tests
.github/
  workflows/ci.yml                      # GitHub Actions: lint + unit tests
```

## Database Schema

11 tables with pgvector support:

| Table | Purpose |
|-------|---------|
| `companies` | Company profiles with products, pricing, team, guardrail config |
| `prospects` | Lead info with qualification scores and tags |
| `conversations` | Status tracking (idle/processing/cancelled) with activeJobId |
| `messages` | Full message history with role, tool_calls, agent_type |
| `memories` | Prospect facts with vector embeddings + confidence |
| `embeddings` | Chunked product docs/FAQs for RAG (pgvector) |
| `pending_approvals` | HITL approval queue |
| `banned_concepts` | Semantic guardrail embeddings |
| `message_queue` | Async webhook processing |
| `meetings` | Scheduled meetings |
| `users` | Authentication (email, passwordHash, companyId, role) |

## HITL (Human-in-the-Loop) Workflow

| Action | Approval Required? |
|--------|-------------------|
| Qualify a lead | No — autonomous |
| Answer product questions | No — autonomous (RAG) |
| Share standard pricing | No — autonomous |
| Apply discount ≤ 10% | No — auto-approved |
| Apply discount > 10% | **Yes** |
| Send proposal | **Yes** — always |
| Book a meeting | **Yes** — always |

Sales reps review pending approvals at `/dashboard/approvals`. When a meeting is approved, a Google Calendar event with auto-generated Meet link is created and a confirmation email is sent to the prospect via Resend.

## Environment Variables

Only `DATABASE_URL`, `OPENAI_API_KEY`, and `NEXTAUTH_SECRET` are required. All integrations are optional with graceful fallbacks.

```bash
# Required
DATABASE_URL=postgresql://dealflow:dealflow@localhost:5433/dealflow
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=your-secret-key-here

# Auth — optional
NEXTAUTH_URL=http://localhost:3000

# Telemetry (Langfuse) — optional
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASEURL=https://cloud.langfuse.com

# Email (Resend) — optional
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Slack — optional
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Telegram — optional
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...

# Google Calendar — optional (falls back to fake slots)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CALENDAR_ID=primary

# App
DEFAULT_COMPANY_ID=<uuid from companies table>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See `.env.example` for the full list with descriptions.

## Testing

```bash
# Run all tests
npm test

# Unit tests only (no external services needed)
npm run test:unit

# Integration tests (needs Docker Postgres running)
npm run test:integration

# E2E tests (needs Docker Postgres running)
npm run test:e2e

# Integration tests with OpenAI (set OPENAI_API_KEY)
OPENAI_API_KEY=sk-... npm run test:integration
```

### Test Coverage — 250 unit tests across 26 files

| Category | Count | What's Tested |
|----------|-------|---------------|
| **Unit — Guardrails** | 70+ | Deterministic regex, semantic threshold, LLM check, fallbacks, stream guard, pipeline contract |
| **Unit — Agents** | 65+ | Qualifier scoring, deal pricing, scheduler slots, knowledge agent, routing logic, supervisor mapping |
| **Unit — Integrations** | 55+ | Email/Slack/Telegram parsing, calendar slots, outbound dispatch, Slack MCP, cross-platform contract |
| **Unit — Memory** | 25+ | Formatting, extraction schema, consolidation decisions, fact categorization |
| **Unit — Pipeline** | 10+ | Inngest payload parsing, step validation, message ordering |
| **Integration** | 14+ | Supervisor classification, database ops, memory extraction |
| **E2E** | 16+ | Chat flow lifecycle, approval flow, webhook pipeline |

## Evaluation

```bash
# LLM-as-Judge scoring across 10 test cases
npm run eval

# RAG Triad: context relevance, faithfulness, answer relevance
npm run eval:rag
```

The golden dataset at `evals/golden-dataset.json` covers: product questions, pricing inquiries, discount requests (auto + HITL), meeting booking, lead qualification, guardrail enforcement, and multi-turn conversations.

## MCP Server

Standalone MCP server exposing company data (DB-backed with hardcoded fallback):

```bash
npm run mcp:server
```

**Tools**: `getProduct`, `searchDocs`, `getCaseStudy`, `getTeamAvailability`, `getProspectHistory`

**Resources**: `company://products/catalog`, `company://pricing/all`

## Demo Scenarios

1. **Lead Qualification** — Prospect shares company info → QualifierAgent asks BANT questions, scores the lead
2. **Product Q&A** — "What integrations do you support?" → KnowledgeAgent searches docs, answers from RAG
3. **Deal Negotiation** — "How much?" → DealAgent shares pricing → "Can I get 25% off?" → HITL approval triggered
4. **Meeting Booking** — "Schedule a demo" → SchedulerAgent checks availability → HITL for confirmation
5. **Guardrails** — "What are your internal margins?" → Deterministic guardrail blocks, returns safe fallback
6. **Memory** — Chat across sessions → agent remembers budget, timeline, requirements

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config) |
| `npm run db:push` | Push schema to DB |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |
| `npm run seed` | Seed demo data + user |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run eval` | Run LLM-as-Judge evals |
| `npm run eval:rag` | Run RAG Triad evals |
| `npm run mcp:server` | Start MCP server |
