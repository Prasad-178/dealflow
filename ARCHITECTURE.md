# Advanced Agentic AI Architecture: Complete System Reference

## Module 1: Messaging Integration & Webhooks

* **Webhooks vs. Polling:** Webhooks provide instant, event-driven data pushes (like Slack or Telegram sending a message event to your server) rather than your server constantly asking for updates.
* **The 3-Second Timeout Problem:** Platforms like Slack require an HTTP `200 OK` within seconds, but LLMs take much longer.
* **Asynchronous Architecture:**
    1. Acknowledge the webhook instantly (`POST /api/webhooks/[platform]`).
    2. Queue payload in PostgreSQL `message_queue` table with status `pending`.
    3. Fire Inngest event `webhook/message.received` to trigger background processing.
    4. Inngest worker runs the full agent pipeline (16 checkpointed steps).
    5. Send outbound reply on the originating platform via the outbound dispatcher.

### Rate Limiting

Webhooks and chat endpoints are protected by a sliding-window in-memory rate limiter (`lib/rate-limit.ts`):
- `/api/chat`: 20 requests/min per IP
- `/api/webhooks/[platform]`: 60 requests/min per IP

Returns HTTP 429 with `Retry-After` header when exceeded.

### Supported Platforms

| Platform | Inbound | Outbound | Verification |
|----------|---------|----------|-------------|
| **Email** (Resend) | Webhook → `parseEmailPayload` | `sendEmail` with In-Reply-To threading | None (trusted relay) |
| **Slack** (Web API + MCP) | Events API → `parseSlackPayload` | `sendSlackMessage` via `chat.postMessage` | HMAC-SHA256 signature + 5-min replay guard |
| **Telegram** (Bot API) | Webhook → `parseTelegramPayload` | `sendTelegramMessage` via fetch | Secret token header verification |
| **Widget** | Direct POST | Inline response | None (same-origin) |
| **API** | Direct POST | Inline response | None (caller responsibility) |

### Webhook Payload Validation

Widget and API parsers validate incoming payloads:
- Require `text` or `message` field with string content
- Validate field types before processing
- Invalid payloads return descriptive error messages

### Slack MCP Integration

The Slack MCP server (`mcp.slack.com/mcp`) provides agents with additional capabilities beyond the webhook-based inbound/outbound flow:
- **Search**: Query workspace messages, files, and channels
- **Channel History**: Read complete conversation threads
- **User Profiles**: Access team member information
- Uses OAuth 2.0 via Streamable HTTP transport
- Complements (does not replace) the Events API webhook approach

### Webhook Security

- **Slack**: HMAC-SHA256 over `v0:timestamp:body` with signing secret, rejects requests older than 5 minutes
- **Telegram**: Compares `X-Telegram-Bot-Api-Secret-Token` header against configured secret
- **Email**: Trusted relay (Resend handles inbound verification)
- All verification is enforced only when credentials are configured (graceful fallback in dev)

### Normalized Message Contract

All platform parsers produce a `NormalizedMessage`:
```typescript
{
  platform: "email" | "slack" | "telegram" | "widget" | "api",
  text: string,
  senderEmail?: string,
  senderHandle?: string,
  senderName?: string,
  replyTo: ReplyTarget  // Platform-specific routing info
}
```

### Outbound Dispatcher

`sendOutboundMessage(msg)` routes to the correct platform sender:
- `email` → Resend API with In-Reply-To headers
- `slack` → Slack Web API `chat.postMessage` with thread support
- `telegram` → Telegram Bot API `/sendMessage` via fetch
- `widget` / `api` → no-op (response returned inline)

---

## Module 2: State Management & Concurrency

* **Handling Rapid Messages:** If a user sends a second message while the agent is still processing the first:
    * Interrupt and kill the active background worker via `AbortController`.
    * Append the new message to the persistent conversation state.
    * Restart the agent with the updated context.
* **Active Job Tracking:** `conversations.activeJobId` tracks the current processing job. New messages abort the previous controller and create a fresh job ID.
* **Queue Lifecycle:** `message_queue` items transition through `pending` → `processing` → `completed` (or `failed`).

---

## Module 3: Advanced Tool Calling

* **Native Tool Calling (Function Calling):** Passing strict JSON schemas to the LLM so it outputs structured data (e.g., `{"tool": "search", "args": {"query": "pricing"}}`) instead of raw text.
* **Model Context Protocol (MCP):** The "USB-C for AI." An open standard separating the AI Client from the Tool Server, allowing agents to dynamically connect to data sources (like Slack or company data) without custom API wrappers.
    - **Local MCP Server** (`lib/mcp/server.ts`): Serves company products, docs, case studies, and team data via stdio transport. DB-backed with hardcoded fallback.
    - **MCP Client** (`lib/mcp/client.ts`): Uses `experimental_createMCPClient` from Vercel AI SDK with `Experimental_StdioMCPTransport`. Singleton pattern.
    - **Slack MCP Server** (`lib/integrations/slack-mcp.ts`): Remote MCP server at `mcp.slack.com/mcp` for workspace search and messaging via Streamable HTTP.
* **Memory Structure:** Tool calls use dedicated message roles (`user`, `assistant` with `tool_calls`, and `tool` for the results).

---

## Module 4: Memory Systems

* **Context Window Optimization:** Relying solely on the context window or KV caching becomes expensive and slow.
* **Long-Term Memory Pipeline:**
    1. **Extract:** A background LLM (via Inngest `extractMemories` function) extracts facts and entities from the chat.
    2. **Store:** Facts are saved in PostgreSQL with pgvector embeddings (1536-dim, `text-embedding-3-small`).
    3. **Retrieve:** `retrieveMemories(prospectId, query)` performs semantic search via cosine distance.
    4. **Inject:** Retrieved facts are formatted as markdown and injected into the agent's system prompt.
* **Memory Consolidation:** Using an LLM "Judge" (`consolidateMemories`) to read old facts and new facts before writing, resolving contradictions and updating preferences over time.
* **Trigger:** The `conversation/completed` Inngest event fires after every completed conversation (both chat UI and webhook pipeline).

---

## Module 5: Multi-Agent Orchestration

* **Supervisor Architecture:** `classifyIntent()` uses `generateObject` to classify the prospect's intent, then routes to the appropriate sub-agent.
* **Sub-Agents:**
    - **Knowledge** (`knowledge.ts`): RAG-powered product Q&A using embedded knowledge base
    - **Deal** (`deal.ts`): Pricing, proposals, and discount negotiation with HITL approval
    - **Scheduler** (`scheduler.ts`): Meeting booking with real Google Calendar availability + HITL approval
    - **Qualifier** (`qualifier.ts`): BANT scoring, lead tagging, and tier classification
* **Intent Types:** `product_question` → Knowledge, `pricing` / `objection` → Deal, `scheduling` → Scheduler, `qualification` → Qualifier, `general` → Knowledge
* **Conditional Re-routing:** If the Qualifier scores a "hot" lead and detects a pricing signal, the response is augmented by also running the Deal agent.
* **Shared State:** All agents read/write to the same PostgreSQL database (conversations, messages, prospects, pendingApprovals).

---

## Module 6: The Trust Layer (Guardrails)

* **Multi-Layered Filtering:**
    1. **Deterministic Rules** (`deterministic.ts`): Regex patterns for confidential info, inappropriate content, and competitor bashing (milliseconds).
    2. **Semantic Filtering** (`semantic.ts`): Vector similarity matching against `banned_concepts` table (threshold 0.85).
    3. **LLM Guardrail** (`llm-check.ts`): GPT-4o-mini checks for over-promising, false claims, pressure tactics, and unauthorized commitments (output only).
* **Fallback Matrix:** Pre-approved, contextually relevant safe responses per violation category — no re-prompting (avoids latency).
* **Applied Twice:** Input guardrails run before the agent pipeline; output guardrails run on the agent's response before sending.

---

## Module 7: Evaluation (Evals)

* **Automated Pipelines:** Running batch tests against a "Golden Dataset" before deployment.
* **LLM-as-a-Judge:** Using a powerful LLM to score the agent's performance mathematically.
* **The RAG Triad:**
    1. **Context Relevance:** Did it fetch the right data?
    2. **Faithfulness:** Is the answer grounded purely in the fetched data (no hallucinations)?
    3. **Answer Relevance:** Does it actually answer the user's prompt?

---

## Module 8: Authentication & Authorization

### NextAuth.js v5

* **Provider:** CredentialsProvider with bcryptjs password hashing
* **Strategy:** JWT (stateless sessions)
* **Session Extension:** Custom `next-auth.d.ts` adds `companyId` and `role` to session user type
* **Edge Compatibility:** Dynamic imports in `authorize()` to avoid Edge Runtime issues with postgres
* **Middleware:** `middleware.ts` protects all `/dashboard/*` and `/api/*` routes, allows public routes (webhooks, inngest, auth, chat, static assets)
* **API Route Pattern:** All dashboard/settings/knowledge API routes check `session.user.companyId` for data scoping

---

## Module 9: Integration Layer

### Google Calendar Integration

* **Real Availability:** `getAvailableSlots()` uses the Google Calendar `freebusy.query` API to check actual busy periods.
* **Slot Generation:** Generates candidate slots at 10AM, 2PM, and 4PM ET on weekdays, marks overlapping ones as unavailable.
* **Event Creation:** `createCalendarEvent()` creates events with `conferenceDataVersion: 1` for automatic Google Meet links.
* **Graceful Fallback:** Without Google credentials, `generateAvailableSlots()` produces fake available slots for development.

### Meeting Approval Flow

When a `bookMeeting` approval is approved via `PATCH /api/approvals/[id]`:
1. Create Google Calendar event with auto-generated Meet link (best-effort)
2. Store `meetingLink` in the `meetings` table
3. Send confirmation email to the prospect via Resend (best-effort)
4. Return the Meet link and calendar status in the API response

### Email Integration (Resend)

* **Inbound:** `parseEmailPayload` handles `"Name <email>"` format, falls back to `body` and `html` fields.
* **Outbound:** `sendEmail` uses `In-Reply-To` and `References` headers for email threading.
* **Meeting Confirmations:** `sendMeetingConfirmation` sends a formatted email with meeting details and Google Meet link.

---

## Module 10: Observability & Operations

### Telemetry (Langfuse + OpenTelemetry)

* **Setup:** `instrumentation.ts` registers `LangfuseSpanProcessor` via `NodeTracerProvider` (Node.js runtime only)
* **Trace Labels:** All AI SDK calls use `experimental_telemetry` with descriptive `functionId`:
    - Agents: `supervisor-classify`, `qualifier-agent`, `deal-agent`, `scheduler-agent`, `knowledge-agent`
    - Guardrails: `guardrail-llm-check`
    - Memory: `memory-extract`, `memory-consolidate`
    - Embeddings: `embed-single`, `embed-batch`

### Structured Logging

* **Logger:** `lib/logger.ts` — `logger.create("module-name")` returns `{ debug, info, warn, error }`
* **Format:** JSON with `{ timestamp, level, module, message, ...data }`
* **Used by:** All integration modules, API routes, Inngest functions

### Rate Limiting

* **Implementation:** `lib/rate-limit.ts` — sliding-window in-memory rate limiter (Map-based, auto-cleanup via `setInterval`)
* **Returns:** `{ success, remaining, reset }`

### CI/CD

* **GitHub Actions:** `.github/workflows/ci.yml` — on PR + push to main: checkout → Node.js 20 → `npm ci` → `npm run lint` → `npm run test:unit`

---

## Module 11: Background Processing (Inngest)

### `processWebhookMessage` — 16 Checkpointed Steps

Each step is a separate `step.run()` for Inngest retry and replay:

1. **Mark processing** — Update queue item status
2. **Fetch queue item** — Read payload from database
3. **Parse payload** — Platform-specific parser → `NormalizedMessage`
4. **Resolve companyId** — From `DEFAULT_COMPANY_ID` env var
5. **Get/create prospect** — Find by email or create new with platform tag
6. **Get/create conversation** — New conversation in `processing` status
7. **Store user message** — Persist to `messages` table, load conversation history
8. **Input guardrails** — Run 3-layer check; send fallback if blocked
9. **Retrieve memories** — Semantic search for prospect context
10. **Classify intent** — Supervisor routes to appropriate agent
11. **Run agent** — Execute the selected sub-agent with full context
12. **Output guardrails** — Validate agent response before sending
13. **Store assistant reply** — Persist agent response with agent type
14. **Send outbound message** — Dispatch reply to originating platform
15. **Mark completed** — Update queue item and conversation status
16. **Emit memory extraction** — Fire `conversation/completed` for background fact extraction

### `extractMemories` — Background Fact Extraction

1. Fetch conversation messages
2. Extract facts via LLM (categories: budget, timeline, needs, objection, preference, context)
3. Consolidate with existing memories (LLM judge resolves contradictions)

---

## End-to-End Flow

```
User sends message (any platform)
  ↓
POST /api/webhooks/[platform]
  ↓ verify signature (Slack/Telegram)
  ↓ rate limit check (60 req/min per IP)
  ↓ validate payload
  ↓ handle url_verification (Slack)
  ↓
Insert into message_queue (status: pending)
  ↓
Fire Inngest event: webhook/message.received
  ↓ Return 200 OK immediately
  ↓
Inngest Worker (16 steps, with structured logging):
  ↓ Parse payload → NormalizedMessage
  ↓ Resolve company → Get/create prospect
  ↓ Create conversation → Store user message
  ↓ Input guardrails (block if violation)
  ↓ Retrieve prospect memories
  ↓ Classify intent → Route to agent
  ↓ Run agent (knowledge/deal/scheduler/qualifier)
  ↓ Output guardrails
  ↓ Store assistant reply
  ↓ Send outbound reply (email/slack/telegram)
  ↓ Mark completed
  ↓
Fire: conversation/completed
  ↓
Extract & consolidate memories (background)
```

### Meeting Booking Sub-Flow

```
Agent calls bookMeeting tool
  ↓ Creates pending approval
  ↓
Human reviews in Dashboard → Approves
  ↓
POST /api/approvals/[id] { status: "approved" }
  ↓ Create Google Calendar event (+ Meet link)
  ↓ Insert into meetings table
  ↓ Send confirmation email to prospect
  ↓
Return { meetingLink, calendarEventCreated }
```

---

## Dashboard

All dashboard pages fetch real data from session-protected API routes scoped to the user's `companyId`:

| Page | API Route | Features |
|------|-----------|----------|
| **Dashboard** | `GET /api/dashboard/stats` | Lead count, avg score, pending approvals, meetings, recent conversations |
| **Leads** | `GET /api/dashboard/leads` | Search by name/email/company, sort by score/name/date, pagination |
| **Approvals** | `GET /api/approvals` | Pending/resolved list, approve/deny with optimistic UI, Meet link display |
| **Knowledge** | `GET /api/dashboard/knowledge` | Entries by type with counts, upload form (chunk + embed), delete |
| **Settings** | `GET/PATCH /api/settings` | Guardrail config: blocked topics, max discount, approval toggles |

---

## Test Coverage

| Category | Count | What's Tested |
|----------|-------|---------------|
| **Unit — Guardrails** | 70+ | Deterministic regex, semantic threshold, LLM check, fallbacks, stream guard, pipeline contract |
| **Unit — Agents** | 65+ | Qualifier scoring, deal pricing, scheduler slots, knowledge agent, routing logic, supervisor mapping, conditional re-routing |
| **Unit — Integrations** | 55+ | Email/Slack/Telegram parsing, calendar slots, outbound dispatch, Slack MCP, cross-platform contract |
| **Unit — Memory** | 25+ | Formatting, extraction schema, consolidation decisions, fact categorization |
| **Unit — Pipeline** | 10+ | Inngest payload parsing, step validation, message ordering |
| **Unit — Other** | 8+ | Embedding chunking, MCP filters |
| **Integration** | 14+ | Supervisor classification, database ops, memory extraction |
| **E2E** | 16+ | Chat flow lifecycle, approval flow, webhook pipeline |
| **Total** | **250** | Full coverage across all modules |

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (with pgvector) |
| `OPENAI_API_KEY` | OpenAI API key for LLM and embeddings |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js JWT encryption |

### Optional — Auth
| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Canonical app URL (defaults to `http://localhost:3000`) |

### Optional — Telemetry
| Variable | Description |
|----------|-------------|
| `LANGFUSE_SECRET_KEY` | Langfuse secret key for trace ingestion |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key |
| `LANGFUSE_BASEURL` | Langfuse instance URL (default: `https://cloud.langfuse.com`) |

### Optional — Integrations (all have graceful fallbacks)
| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key for email sending |
| `RESEND_FROM_EMAIL` | Verified sender email (must be verified domain in Resend) |
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token (`xoxb-...`) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret (Basic Information → App Credentials) |
| `SLACK_CLIENT_ID` | Slack app client ID (for MCP OAuth) |
| `SLACK_CLIENT_SECRET` | Slack app client secret (for MCP OAuth) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Self-defined secret for webhook verification |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Google service account private key (PEM) |
| `GOOGLE_CALENDAR_ID` | Calendar ID (`primary` or specific calendar email) |
| `DEFAULT_COMPANY_ID` | UUID of the company record for webhook conversations |

### Frontend Status Flags
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_RESEND_CONFIGURED` | Show Email as connected in Settings |
| `NEXT_PUBLIC_SLACK_CONFIGURED` | Show Slack as connected in Settings |
| `NEXT_PUBLIC_TELEGRAM_CONFIGURED` | Show Telegram as connected in Settings |
| `NEXT_PUBLIC_CALENDAR_CONFIGURED` | Show Calendar as connected in Settings |
