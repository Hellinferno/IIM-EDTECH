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
- App routes: `/`, `/live-ocr`, `/send-image`
- API routes: `/api/ocr`, `/api/chat`, `/api/image`, `/api/webhooks/clerk`

2. Core modules
- Gemini client (`lib/gemini.ts`)
- Prompts (`lib/prompts/live-ocr.ts`, `lib/prompts/send-image.ts`)
- Supabase helper (`lib/supabase.ts`)
- SSE helpers (`lib/api.ts`, `lib/sse-client.ts`)

3. Client hooks/components
- `useCamera`, `useOCR`, `useChat`
- Chat UI primitives (`ChatThread`, `ChatInput`, etc.)
- `ImageUpload` component

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
- Dependency install + typecheck/lint/build: complete
- QA and prompt hardening: pending manual validation
- Production deployment: pending

## Next Steps

1. Configure real Clerk, Supabase, and Gemini keys in `.env.local`.
2. Run end-to-end manual QA for both modes (camera devices + image cases).
3. Run prompt benchmark matrix from `TASKS.md` and record findings in `KNOWN_ISSUES.md`.
4. Resolve audit warnings via planned dependency upgrade path before beta launch.
