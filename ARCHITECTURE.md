# System Architecture

## Project

- Product: ClarityAI
- Stage: working prototype
- Frontend: Next.js App Router
- AI provider: Google Gemini
- Auth: Clerk
- Storage: Supabase

## High-Level Shape

```text
Browser
  |
  +-- /live-ocr
  |     - camera stream
  |     - exam-aware tutoring
  |     - OCR deep scan
  |     - voice input and output
  |
  +-- /send-image
  |     - image upload
  |     - streamed worked solution
  |     - follow-up conversation
  |
  +-- /exam-select
        - exam choice before live tutoring

Next.js App Router
  |
  +-- app/api/chat
  +-- app/api/ocr
  +-- app/api/image
  +-- app/api/webhooks/clerk
  |
  +-- lib/gemini.ts
  +-- lib/supabase.ts
  +-- lib/rate-limit.ts

External Services
  |
  +-- Google Gemini
  +-- Clerk
  +-- Supabase
```

## Route Responsibilities

### App routes

- `/`
  - Signed-in home screen with mode selection
- `/exam-select`
  - Collects exam context for the live tutor
- `/live-ocr`
  - Main combined camera, OCR, text, and voice workspace
- `/voice-agent`
  - Redirect-only compatibility route into `/live-ocr`
- `/send-image`
  - Upload-and-solve workflow

### API routes

- `/api/chat`
  - Shared streaming chat endpoint
  - Supports `live_ocr`, `live_ocr_agent`, `send_image`, and `voice_agent`
  - Validates message shape and exam selection
  - Returns SSE for incremental rendering
- `/api/ocr`
  - OCR endpoint for deep scans from the camera flow
- `/api/image`
  - First-pass solution streaming for uploaded images
- `/api/webhooks/clerk`
  - Mirrors Clerk user lifecycle events into Supabase

## Frontend Architecture

### Shared client building blocks

- `useCamera`
  - Starts and stops the browser camera stream
  - Produces compressed frames from the active `<video>` element
- `useVoiceInput`
  - Wraps browser speech recognition
- `useVoiceOutput`
  - Wraps browser speech synthesis
- `useInterrupt`
  - Stops in-flight speech and network work cleanly
- `consumeSSE`
  - Parses streamed `data:` events from API routes

### Live tutor flow

Primary page: `app/(app)/live-ocr/page.tsx`

Main hook: `hooks/useLiveOCRAgent.ts`

Responsibilities:

- maintain conversation state
- capture the current frame when the student asks a question
- optionally run deep OCR scans through `/api/ocr`
- keep a small scan-memory window for the current session
- stream tutor replies through `/api/chat`
- speak complete sentence chunks as they arrive

This route is the main product experience now. Voice is not a separate full page anymore; it is embedded into the live OCR tutor.

### Send image flow

Primary page: `app/(app)/send-image/page.tsx`

Responsibilities:

- accept image selection
- compress large uploads client-side
- call `/api/image` for the initial streamed answer
- hand off to `ConversationPanel` for follow-up turns

## Backend Architecture

### Gemini service layer

`lib/gemini.ts` centralizes provider behavior:

- `extractTextFromFrame`
  - image-to-text OCR request
- `streamChat`
  - chat and multimodal streaming request
- quota, rate-limit, and configuration classification
- fallback model order

Current model order:

1. `gemini-2.5-flash-lite`
2. `gemini-2.5-flash`
3. `gemini-flash-lite-latest`
4. `gemini-flash-latest`
5. `gemini-2.0-flash-lite`
6. `gemini-2.0-flash`

Why this matters:

- the older `gemini-1.5-*` entries were removed because they now return `404`
- the request builder now sends `systemInstruction` in a valid Gemini format
- the fallback list is ordered toward low-cost models first

### Prompt layer

- `lib/prompts/live-ocr.ts`
  - guided tutoring rules
  - exam-specific live OCR system prompt builder
- `lib/prompts/send-image.ts`
  - direct worked-solution prompt
- `lib/prompts/voice-agent.ts`
  - exam-aware spoken tutor framing

### Rate limiting

`lib/rate-limit.ts` provides an in-memory sliding window limiter for prototype traffic.

Current use:

- `/api/image` applies per-user protection

This is process-local and prototype-grade, not shared across instances.

## Data and Persistence

### Clerk

- handles sign-in and sign-up
- protects all app routes except declared public routes
- emits webhook events used to keep Supabase user records in sync

### Supabase

- `users` table stores mapped Clerk user identity
- `images` bucket stores temporary uploaded question images

Current persistence model:

- chat history is in browser memory only
- scan memory in the live tutor is session-local only
- uploaded images are best-effort persisted for temporary traceability

## End-to-End Flows

### Live OCR plus voice

```text
User signs in
  -> /exam-select
  -> /live-ocr?exam=JEE
  -> camera starts
  -> user taps mic or types
  -> current frame is captured
  -> optional page scan via /api/ocr
  -> /api/chat receives:
       mode
       exam
       messages
       current image
       scan-memory OCR text
  -> Gemini streams reply
  -> SSE updates UI
  -> browser TTS speaks completed sentences
```

### Send image

```text
User uploads image
  -> client compresses file
  -> /api/image validates upload
  -> temporary Supabase upload
  -> Gemini streams first full solution
  -> conversation continues through /api/chat
```

## Error Handling Strategy

### Provider failures

The app now separates:

- quota exhaustion
- temporary rate limiting
- invalid Gemini request or key configuration
- missing or unsupported models

This prevents unrelated provider failures from surfacing as the same generic error.

### Browser capability failures

The live tutor surfaces:

- no camera available
- camera permission denied
- microphone unavailable in the current browser
- aborted or interrupted speech sessions

## Security and Prototype Constraints

- app and API access are user-scoped through Clerk
- route handlers validate request shape before hitting Gemini
- image and chat payloads should not be logged
- rate limiting is intentionally simple and in-memory
- this is not yet a multi-instance hardened architecture

## Operational Notes

- Restart the Next.js process after changing `.env.local`, especially `GEMINI_API_KEY`.
- If a Gemini key has zero quota on `2.0` models, the app can still succeed on newer supported models if quota exists there.
- A production deployment should replace the in-memory limiter and add centralized telemetry.
