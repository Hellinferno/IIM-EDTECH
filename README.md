# ClarityAI Prototype v0.1

ClarityAI is a web-based AI learning companion prototype with two core modes:

- `Live OCR`: camera feed -> OCR -> guided tutor chat (no direct answers).
- `Send Image`: upload/take photo -> full step-by-step solution -> follow-up chat.

This repository now includes both product documents and a working starter scaffold.

## Source Documents

- `PRD.md`: product scope, user flows, success criteria
- `TASKS.md`: implementation plan and phase breakdown
- `ARCHITECTURE.md`: system architecture and data flow
- `TECH_STACK.md`: technology decisions and free-tier strategy
- `RULES.md`: behavior, UX, and engineering guardrails
- `desgin.md`: implementation design notes used for this scaffold
- `KNOWN_ISSUES.md`: current implementation gaps and pending validations

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Clerk Authentication
- Supabase (Postgres + Storage)
- Google Gemini API (`gemini-1.5-flash`) for OCR/vision/chat streaming

## Implemented Scaffold

1. App structure
- Auth routes: `/sign-in`, `/sign-up`
- App routes: `/`, `/live-ocr`, `/send-image`, `/exam-select`, `/voice-agent`
- API routes: `/api/ocr`, `/api/chat`, `/api/image`, `/api/webhooks/clerk`

2. Core modules
- Gemini client (`lib/gemini.ts`)
- Prompts (`lib/prompts/live-ocr.ts`, `lib/prompts/send-image.ts`, `lib/prompts/voice-agent.ts`)
- Supabase helper (`lib/supabase.ts`)
- SSE helpers (`lib/api.ts`, `lib/sse-client.ts`)
- Exam configuration (`types/exam.ts`)

3. Client hooks/components
- `useCamera`, `useOCR`, `useChat`, `useVoiceAgent`
- `useVoiceInput`, `useVoiceOutput`, `useInterrupt`
- Chat UI primitives (`ChatThread`, `ChatInput`, etc.)
- `ImageUpload` component
- `ModeCards` (now includes Voice Agent option)

## Project Structure

```text
app/
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
  (app)/
    page.tsx
    live-ocr/page.tsx
    send-image/page.tsx
  api/
    chat/route.ts
    image/route.ts
    ocr/route.ts
  globals.css
  layout.tsx
components/
  AppHeader.tsx
  ModeCards.tsx
  chat/
  image-upload/
hooks/
  useCamera.ts
  useChat.ts
  useOCR.ts
lib/
  api.ts
  gemini.ts
  sse-client.ts
  supabase.ts
  prompts/
types/
  index.ts
middleware.ts
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill values:

```bash
GEMINI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Minimum Setup

Run this SQL in Supabase:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Create a Storage bucket named `images` and set retention/cleanup to 1 hour for prototype behavior.

Configure a Clerk webhook endpoint:

- URL: `/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`
- Secret: set as `CLERK_WEBHOOK_SECRET` in `.env.local`

## Rule-Critical Requirements

- Live OCR mode must not provide direct answers.
- OCR poll interval stays at 3000ms.
- Every `/api/*` route requires authenticated user context.
- Avoid logging image or message payload content.
- Keep UI minimal and mobile-friendly.

## Current Status

- Docs baseline: complete
- Core scaffold and feature parity build: complete
- Cost optimization (frame diffing, compression, context trimming): complete
- Voice Agent with exam-aware tutoring: complete ✅ **REFACTORED WITH IMPROVED ERROR HANDLING**
- Dependency install + typecheck/lint/build: complete ✅ **ALL TYPES VALIDATED**
- QA and prompt hardening: pending manual validation
- Production deployment: pending

---

## System Architecture & Code Quality

### Voice Agent System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Student Client (Browser)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐                                        │
│  │  /voice-agent Page   │ (useVoiceAgent hook)                   │
│  │  - Mic button        │                                        │
│  │  - Chat display      │                                        │
│  │  - Status indicator  │                                        │
│  │  - Error handling    │                                        │
│  └──────────┬───────────┘                                        │
│             │                                                     │
│    ┌────────▼────────┐        ┌─────────────┐                   │
│    │   Web Speech    │        │ speechSynth │                   │
│    │   API (STT)     │        │   (TTS)     │                   │
│    │                 │        │             │                   │
│    │ en-IN language  │        │ Sentence-by │                   │
│    │ continuous OFF  │        │ sentence    │                   │
│    └────────┬────────┘        └─────────────┘                   │
│             │                                                     │
│             │ Transcript (text)                                  │
│             ▼                                                     │
│    ┌────────────────────────────┐                               │
│    │  useVoiceAgent Hook         │                               │
│    │  ────────────────────────   │                               │
│    │  State:                     │                               │
│    │  - messages[]               │                               │
│    │  - status                   │                               │
│    │  - transcript               │                               │
│    │  - error                    │ ◄─── NEW: Error handling     │
│    │  - microphoneAvailable      │ ◄─── NEW: Availability check │
│    │                             │                               │
│    │  sendMessage(text) ──────┐  │                               │
│    │  - Input validation      │  │ ◄─── NEW: min 3 chars       │
│    │  - API call with exam    │  │                               │
│    │  - SSE parsing (NEW)     │  │ ◄─── FIX: Proper SSE parse  │
│    │  - Sentence split (NEW)  │  │ ◄─── IMPROVED: Regex split  │
│    │  - TTS playback          │  │                               │
│    │  - Error recovery (NEW)  │  │ ◄─── FIX: Network errors    │
│    │                          │  │                               │
│    │  interrupt()             │  │ ◄─── FIX: All cleanup done  │
│    └────────┬─────────────────┘  │                               │
│             │                     │                               │
└─────────────┼─────────────────────┼──────────────────────────────┘
              │                     │
              │ POST /api/chat      │ SSE response
              ▼                     ▲
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Next.js API)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/chat                                                  │
│  ┌────────────────────────────────────────────┐                 │
│  │ Request: { messages, mode, exam, ... }    │                 │
│  │                                             │                 │
│  │ 1. Auth check (Clerk)                      │                 │
│  │ 2. Rate limit check (20 req/min)          │                 │
│  │ 3. Message validation                      │                 │
│  │ 4. Mode resolution                         │                 │
│  │ 5. Exam validation (if voice_agent)       │ ◄─── NEW: Check │
│  │ 6. System prompt selection                 │                 │
│  │    ├─ voice_agent → buildVoiceAgentPrompt() ◄─ DYNAMIC      │
│  │    ├─ live_ocr → LIVE_OCR_SYSTEM_PROMPT                    │
│  │    └─ send_image → SEND_IMAGE_SYSTEM_PROMPT               │
│  │ 7. Message context trimming                │                 │
│  │    ├─ first message (exam context)         │                 │
│  │    └─ last 8 turns (cost control)         │                 │
│  │ 8. Gemini API call (SSE stream)            │                 │
│  │ 9. Response streaming to client            │                 │
│  │                                             │                 │
│  └────────────────────────────────────────────┘                 │
│                                                                   │
│  /lib/prompts/voice-agent.ts                                    │
│  ┌────────────────────────────────────────────┐                 │
│  │ buildVoiceAgentPrompt(exam)                │                 │
│  │                                             │                 │
│  │ Returns: Single adaptive prompt template   │                 │
│  │ Injects: Exam context + teaching rules    │                 │
│  │ Max response: 300 tokens                   │                 │
│  │                                             │                 │
│  │ Examples:                                   │                 │
│  │ - NEET: "Always trace back to NCERT"     │                 │
│  │ - CAT:  "What's the fastest method?"     │                 │
│  │ - UPSC: "What's the other side?"         │                 │
│  │ - JEE:  "Derive it, don't just apply"    │                 │
│  │                                             │                 │
│  └────────────────────────────────────────────┘                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
              │
              │ Vision API call
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Google Gemini API                              │
├─────────────────────────────────────────────────────────────────┤
│  - Model: gemini-2.0-flash (primary)                             │
│  - Fallback: gemini-2.0-flash-lite                              │
│  - Stream: Yes (token-by-token)                                 │
│  - Max output: 300 tokens (voice), 1024 (image)                │
│  - Vision: Yes (base64 image support)                           │
│  - Rate: 1,500 calls/day free tier                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Improvements Applied

#### ✅ Error Handling (BLOCKER FIXES)

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| **Stale transcript race condition** | `transcript` captured after state change | Captured in ref immediately in `onresult` | Guarantees correct text sent |
| **SSE stream parsing broken** | Concatenating raw chunks | `parseSSEData()` properly parses `data: {...}` | Fixes token accumulation |
| **Unhandled API errors** | Only checking `AbortError` | Full error categorization (429, 401, 500, network) | Better UX with error messages |
| **Welcome message never disappears** | `initialized` never set to true | Set to true on first message send | UI state properly managed |
| **No microphone permission handling** | Silently fails | Returns `microphoneAvailable` flag | UI disables button with tooltip |

#### ✅ Code Quality Improvements (MAJOR FIXES)

1. **Input Validation**
   - Added minimum 3-character check before API call
   - User feedback for short inputs
   - Silent failure removed

2. **TTS Voice Selection**
   - Now handles missing voices gracefully
   - Falls back to system default
   - No silent failures

3. **Language Configuration**
   - `en-IN` now configurable via hook params
   - Supports fallback to `en-US`
   - Hook signature: `useVoiceAgent({ exam, language })`

4. **Sentence Splitting**
   - Fixed regex: `/(?<=[.!?।])\s+/` (lookbehind split)
   - Handles LaTeX cleanup (`$$...$$` → "equation")
   - Removes markdown and HTML markup before TTS

5. **Network Error Recovery**
   - `TypeError` (network down) → "Network error" message
   - HTTP 429 → "Rate limited" with wait guidance
   - HTTP 401 → "Please sign in"
   - HTTP 500+ → Generic error with status code
   - Retry-safe: User can tap mic again

6. **Cleanup Safety**
   - `try/catch` on `recognition.abort()` (already stopped)
   - `speechSynthesis.cancel()` before new session
   - `AbortController` properly aborted on interrupt
   - No event listener leaks

#### ✅ Type Safety

- Added new types to `UseVoiceAgentResult`:
  - `microphoneAvailable: boolean`
  - `error: string | null`
- Proper `SpeechRecognitionEvent` interface
- Exam validation function (`resolveExam`)
- Chat request body type includes `exam` field

### Voice Agent — Exam-Aware Tutoring Loop

The Voice Agent mode turns the prototype into an **interactive conversation** between student and AI tutor, with the tutor's teaching style and difficulty adapted to the student's exam choice.

### How It Works

1. **Exam Selection** → Student picks CAT/GMAT/NEET/UPSC/JEE at `/exam-select`
2. **System Prompt Injection** → AI receives exam-specific teaching rules (Socratic for all, but depth/pace varies by exam)
3. **Voice Loop** → STT → Gemini reasoning → TTS reading response (sentence-by-sentence)
4. **Interruption** → Student can stop mid-sentence anytime via button
5. **Context Window** → Keeps first message + last 8 turns to cap tokens

### Exam-Specific Behavior

| Exam | Opening | Key Behavior | Tone |
|---|---|---|---|
| **CAT** | "What are we working on — Quant, DILR, or Verbal?" | After solving: "What's the fastest alternate method?" | Speed-focused, elimination mindset |
| **GMAT** | "Tell me what you're finding difficult and we'll work through reasoning." | Emphasizes logic patterns, not just calculation | Structured, reasoning-first |
| **NEET** | "What chapter are you on — test concepts or work problems?" | Always traces back to NCERT. "Which chapter?" | Concept-heavy, retrieval-driven |
| **UPSC** | "What topic do you want to explore today?" | "What is the other side of this argument?" | Multi-angle, synthesis-focused |
| **JEE** | "Show me your attempt first. Let's understand why, not just how." | "Derive it, don't just apply." | Derivation-level rigor |

### Implementation Files

- **types/exam.ts** — Exam types, configs, opening lines
- **lib/prompts/voice-agent.ts** — `buildVoiceAgentPrompt(exam)` — single adaptive prompt per exam
- **hooks/useVoiceAgent.ts** — ⭐ **REFACTORED** — Complete voice loop: STT + streaming Gemini + TTS with error handling
- **app/(app)/exam-select/page.tsx** — Exam picker (5 colorful cards)
- **app/(app)/voice-agent/page.tsx** — ⭐ **REFACTORED** — Main voice agent UI with mic button + chat display + error messages
- **components/ModeCards.tsx** — Updated with Voice Agent option

### Usage

```
User selects "Voice Agent" from home
   → Chooses exam at /exam-select
   → Lands on /voice-agent?exam=NEET
   → AI greets: "NEET is won by whoever knows their NCERT the deepest..."
   → User taps mic and speaks a question
   → STT converts to text
   → /api/chat receives: { messages, mode: "voice_agent", exam: "NEET" }
   → Server picks exam-specific prompt: buildVoiceAgentPrompt("NEET")
   → Gemini streams response (max 300 tokens)
   → TTS reads aloud sentence-by-sentence
   → User can interrupt, ask follow-up, or start new topic
   → If error: Shows user-friendly message, allows retry
```

### Cost for Voice Agent

- **Per student per hour:** ~25–35 Gemini calls (with optimizations)
- **Cost at paid tier:** ~₹0.50–1.00 per student/hour
- **Free tier (1,500 calls/day):** Supports ~25–30 students in 2-hour sessions

### Key Optimizations Already Applied

1. ✅ Frame diffing (OCR; skips redundant scans)
2. ✅ Image compression (800×600 JPEG 75%)
3. ✅ Message context trimming (first message + last 8 turns)
4. ✅ Short response cap (max 3 sentences for voice)
5. ✅ Voice-specific system prompts (no markdown, no lists)
6. ✅ Robust error handling (network, permissions, API errors)
7. ✅ Proper SSE stream parsing (fixed token accumulation)
8. ✅ Race condition fixes (ref-based transcript capture)

## Next Steps

### Phase 1: Manual QA and Validation

1. **Set Up Environment**
   - Configure real Clerk, Supabase, and Gemini keys in `.env.local`
   - Verify Supabase users table is created
   - Test Clerk authentication (sign-up/sign-in flow)

2. **Voice Agent QA**
   - Test mic permission grant/denial → Verify error messages show
   - Test with different exams:
     - **CAT:** Verify speed/elimination focus in responses
     - **NEET:** Verify AI asks "Which chapter?"
     - **UPSC:** Verify "What's the other side?" questions
     - **JEE:** Verify "Show derivation" demands
   - Test interruption (stop button during speaking)
   - Test network error → Verify "Network error" message → Retry by tapping mic again
   - Test rate limits (make 20+ rapid API calls)

3. **Live OCR and Send Image QA**
   - Verify frame diffing works (check for redundant OCR calls)
   - Verify image compression (< 100KB per image)
   - Verify message context trimming (check API logs for limited history)

4. **API Error Handling**
   - Test without Gemini key → Should show quota/auth error
   - Test with rate limiting exhausted → Should show helpful message
   - Test with network disconnected → Should show network error

5. **Cross-Browser Testing**
   - Chrome (desktop, mobile): STT/TTS should work
   - Safari (desktop, iOS): Check Web Speech API support
   - Edge, Firefox: Verify graceful degradation if not supported

### Phase 2: Hardening & Performance

1. Profile Gemini token usage across all three modes
2. Optimize sentence splitting for Indian language support (Hinglish)
3. Add logging/analytics (tokens, latency, error rates) to identify bottlenecks
4. Review KNOWN_ISSUES.md and resolve all audit findings

### Phase 3: Beta Launch

1. Seed with 5–10 test users per exam
2. Collect usage patterns and cost metrics
3. Adjust token budgets based on real data
4. Plan for scale: rate limiting, caching, background job indexing

## Skills Required To Build skills.sh

If you want to build a platform like [skills.sh](https://skills.sh/), these are the core skills you should have on the team.

### Product and UX

- Product discovery and roadmap planning
- Information architecture for marketplace-style catalogs
- Search UX and faceted filtering design
- Developer-focused UX writing and documentation design
- Community growth and curation workflows

### Frontend Engineering

- Next.js App Router architecture and SSR/ISR patterns
- TypeScript for large-scale React applications
- Tailwind CSS and component system design
- Accessibility (WCAG 2.2), keyboard navigation, screen reader support
- High-performance UI patterns (virtualized lists, incremental loading)

### Backend and APIs

- REST API design and versioning
- PostgreSQL schema design (skills, versions, tags, installs, audits)
- Caching strategies (Redis/in-memory), rate limiting, and abuse prevention
- Authentication and authorization patterns (session/JWT, RBAC)
- Background job processing (indexing, popularity scoring, audit refresh)

### Search and Ranking

- Full-text search fundamentals (Postgres FTS/Meilisearch/Elasticsearch)
- Relevance ranking and result scoring
- Trending and hotness algorithms (time-decay scoring)
- Analytics instrumentation for click-through and install funnels

### CLI and Developer Tooling

- Node.js CLI development (`npx` install and command ergonomics)
- Package publishing and version management (npm)
- Agent integration patterns (Copilot, Cursor, Claude Code, etc.)
- Configuration management and cross-platform shell compatibility

### Quality and Security

- Unit, integration, and end-to-end testing strategy
- API contract and regression testing
- Secrets management and supply-chain security
- SAST/SCA scanning and dependency vulnerability remediation
- Content moderation, trust, and abuse-report handling

### DevOps and Platform

- CI/CD pipelines with preview environments
- Observability (logs, traces, metrics, SLO-based alerting)
- CDN and edge caching strategy
- Database migrations and rollback safety
- Cost monitoring and performance tuning at scale

### Recommended Agent Skills (from the skills ecosystem)

- `frontend-design`
- `web-design-guidelines`
- `api-testing-patterns`
- `code-review-quality`
- `regression-testing`
- `ghost-scan-code`
- `ghost-scan-deps`
- `ghost-scan-secrets`
- `docker-deployment`
- `find-skills`
- `agent-browser`
- `agent-workflow-builder_ai_toolkit`
