# ClarityAI Design Document (Prototype v0.1)

This file captures the practical implementation design used to begin development.

## 1. Product Modes

1. Live OCR mode
- Camera frame captured every 3 seconds.
- Frame sent to `/api/ocr`.
- Extracted text is shown in a floating card.
- Chat uses guided tutor behavior with no direct final answers.

2. Send Image mode
- Student uploads or captures a question image.
- Image sent to `/api/image` for first answer stream.
- Assistant returns full step-by-step answer.
- Follow-up conversation continues through `/api/chat`.

## 2. UX Layout Decisions

1. Home
- Two clear mode cards only: `Live OCR` and `Send Image`.
- Minimal header with app name and user menu.

2. Live OCR screen
- 50% viewport camera region, 50% chat region.
- OCR text card overlays camera bottom edge.
- "End Session" clears chat and stops camera stream.

3. Send Image screen
- Upload-first centered flow.
- Image preview pinned above chat.
- Chat input appears after initial analysis completes.

## 3. Backend Route Design

1. `/api/ocr`
- Auth required.
- Input: base64 image.
- Output: `{ text: string }`.

2. `/api/chat`
- Auth required.
- Input: `{ messages, mode, ocrText?, image? }`.
- Output: SSE token stream.
- Prompt selected by mode.

3. `/api/image`
- Auth required.
- Input: multipart image file.
- Validates size and format.
- Performs best-effort upload to Supabase temp bucket.
- Streams first full answer using direct-mode prompt.

## 4. Core Client Hooks

1. `useCamera`
- Starts/stops browser camera stream.
- Captures compressed JPEG frame from video.
- Exposes permission and device availability states.

2. `useOCR`
- Polls OCR endpoint every 3000ms.
- Updates detected text only when OCR output changes.

3. `useChat`
- Stores in-memory conversation state.
- Sends messages to `/api/chat`.
- Handles SSE token streaming.

## 5. Safety and Rules Alignment

1. Live OCR prompt enforces no direct answers.
2. Send Image prompt enforces complete step-by-step solutions.
3. API routes reject unauthenticated calls.
4. Only user metadata should be logged (not image/message payloads).
5. Chat state remains in-memory for prototype scope.

## 6. Immediate Next Build Steps

1. Install dependencies and run local dev server.
2. Add Clerk middleware and auth flow smoke tests.
3. Connect Supabase table and image bucket.
4. Validate Gemini streaming in both modes.
5. Run manual QA checklist from `TASKS.md`.
