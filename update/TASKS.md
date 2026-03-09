# Implementation Tasks

> **Total: ~20 dev days | Cost: $0**
>
> Scope: Prototype with full conversational voice feature.
> WASM voice (Whisper/Piper/Vosk) is a launch upgrade — not in scope here.

---

## Phase 1 — Project Foundation (Days 1–3)

### Task 1.1 — Next.js Setup
- [ ] `npx create-next-app@latest clarity-ai --typescript --tailwind --app`
- [ ] Install dependencies:
  ```bash
  npm install @google/generative-ai @clerk/nextjs @supabase/supabase-js framer-motion
  ```
- [ ] Create `.env.local` with all 7 environment variables (see TECH_STACK.md)
- [ ] Configure `next.config.mjs` — no WASM headers needed for prototype

### Task 1.2 — Clerk Auth
- [ ] Wrap `app/layout.tsx` with `<ClerkProvider>`
- [ ] Add `middleware.ts` to protect all routes except `/` and `/sign-in`
- [ ] Build `/sign-in` and `/sign-up` pages using Clerk components
- [ ] Create `POST /api/webhooks/clerk` route — syncs new user to Supabase `users` table
- [ ] Install `svix` for webhook signature verification: `npm install svix`
- [ ] Test locally with ngrok: `ngrok http 3000` → paste URL in Clerk dashboard → Webhooks

### Task 1.3 — Supabase Setup
- [ ] Create Supabase project at supabase.com
- [ ] Run schema SQL in Supabase SQL editor:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ```
- [ ] Create `images` storage bucket (private)
- [ ] Create `lib/supabase.ts` — server and browser clients

### Task 1.4 — Home Screen
- [ ] Build `/` landing page with two mode buttons: **Live OCR** and **Send Image**
- [ ] Add Clerk `<UserButton />` in header
- [ ] Mobile responsive layout

---

## Phase 2 — Gemini AI Client (Days 4–5)

### Task 2.1 — Gemini Client
- [ ] Create `lib/gemini.ts`:
  ```typescript
  import { GoogleGenerativeAI } from "@google/generative-ai";
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  ```
- [ ] ⚠️ Model must be `gemini-2.0-flash` — not `gemini-1.5-flash`, not `gemini-3`

### Task 2.2 — System Prompts
- [ ] Create `lib/prompts.ts` with two prompts:

  **`SOCRATIC_PROMPT`** (Live OCR + Conversation mode):
  ```
  You are an elder sibling helping a JEE/NEET student. You NEVER give direct answers.
  First silently identify the mistake type: Conceptual / Procedural / Calculation / Reading.
  Then ask ONE guiding question based on that mistake type.
  Max 2–3 sentences. End with a question mark.
  ```

  **`SOLUTION_PROMPT`** (Send Image mode):
  ```
  You are a JEE/NEET tutor. Provide a complete numbered step-by-step solution.
  After each step, explain WHY. End with the concept name. If the image is unclear, say so.
  ```

### Task 2.3 — API Route: `/api/ocr`
- [ ] Accept `{ frame: string }` — base64 camera frame
- [ ] Call `gemini-2.0-flash` vision to extract text/equations
- [ ] Return `{ text: string }`

### Task 2.4 — API Route: `/api/chat`
- [ ] Accept `{ messages: Message[], image?: string }`
- [ ] Validate `messages` array is not empty
- [ ] Inject `SOCRATIC_PROMPT` as system instruction
- [ ] Pass full `messages[]` history to Gemini — never single prompt
- [ ] Stream response tokens back using `ReadableStream`

### Task 2.5 — API Route: `/api/image`
- [ ] Accept `{ image: string, question?: string }`
- [ ] Upload to Supabase Storage → call Gemini → delete image (use try/finally)
- [ ] Inject `SOLUTION_PROMPT`
- [ ] Stream full step-by-step solution back

---

## Phase 3 — Conversational Voice Feature (Days 6–9)

> This is the core new addition to the prototype.

### Task 3.1 — `useVoiceInput` Hook
- [ ] Create `hooks/useVoiceInput.ts`:
  ```typescript
  // Wraps Web Speech API SpeechRecognition
  // Returns: { transcript, isListening, startListening, stopListening, error }
  // On result: fires onTranscript(text) callback
  // Handles browser compatibility (Chrome/Edge only for now)
  ```
- [ ] Add graceful fallback UI message if browser doesn't support Web Speech API

### Task 3.2 — `useVoiceOutput` Hook
- [ ] Create `hooks/useVoiceOutput.ts`:
  ```typescript
  // Wraps Web SpeechSynthesis API
  // Returns: { speak(text), stop, isSpeaking }
  // Speaks sentence by sentence as tokens stream in
  // stop() calls speechSynthesis.cancel() immediately
  ```

### Task 3.3 — `useConversation` Hook
- [ ] Create `hooks/useConversation.ts`:
  ```typescript
  // Manages messages[] state
  // Returns: { messages, addUserMessage, addAssistantMessage, clearHistory }
  // Never loses history mid-session
  // messages[] is passed to /api/chat on every turn
  ```

### Task 3.4 — `useInterrupt` Hook
- [ ] Create `hooks/useInterrupt.ts`:
  ```typescript
  // Manages AbortController ref
  // Returns: { interrupt() }
  // interrupt() fires: speechSynthesis.cancel() + abortController.abort()
  // Both must fire synchronously — zero delay
  ```

### Task 3.5 — Conversational Chat UI Component
- [ ] Create `components/ConversationPanel.tsx`:
  - Chat bubble list (user messages right, AI messages left)
  - Mic button: green pulse when listening
  - Stop button: red, visible only when AI is speaking/thinking
  - Status indicator (Listening / Thinking / Speaking) with Framer Motion animation
  - Auto-scroll to latest message
  - Text fallback input for non-voice browsers

---

## Phase 4 — Live OCR Screen (Days 10–13)

### Task 4.1 — `useCamera` Hook
- [ ] Create `hooks/useCamera.ts`
- [ ] `getUserMedia({ video: { facingMode: 'environment' } })` — rear camera on mobile
- [ ] `captureFrame()` — draws frame to canvas, returns base64
- [ ] Expose `startCamera()`, `stopCamera()`, `captureFrame()`

### Task 4.2 — `useOCR` Hook
- [ ] Create `hooks/useOCR.ts`
- [ ] Accepts base64 frame → calls `/api/ocr` → returns extracted text
- [ ] Debounce: only call OCR if frame changed meaningfully (compare hashes)
- [ ] Auto-capture mode: run `captureFrame()` every N seconds (configurable 5–30s)
- [ ] Voice-trigger mode: capture only when student says "take a photo" / "look at this"

### Task 4.3 — Live OCR Page
- [ ] Create `app/live-ocr/page.tsx`
- [ ] Layout: camera feed top half, conversation panel bottom half
- [ ] When OCR extracts new text: append to current user context, trigger Gemini response
- [ ] Integrate `ConversationPanel` with full voice in/out
- [ ] Show blink animation when snapshot is taken (privacy indicator)

---

## Phase 5 — Send Image Screen (Days 14–16)

### Task 5.1 — Image Upload Component
- [ ] Create `components/ImageUpload.tsx`
- [ ] Drag-and-drop + file picker + camera capture button
- [ ] Preview selected image before sending
- [ ] Compress image client-side if >2MB (`browser-image-compression` library)

### Task 5.2 — Send Image Page
- [ ] Create `app/send-image/page.tsx`
- [ ] Upload image → stream full solution from `/api/image`
- [ ] After solution shown: open `ConversationPanel` for follow-up questions
- [ ] Follow-up chat uses Socratic mode (not solution mode)
- [ ] Voice in/out works for follow-up questions

---

## Phase 6 — Polish & Student Testing (Days 17–20)

### Task 6.1 — UI States
- [ ] Loading skeleton while Gemini is thinking
- [ ] Error boundary: show friendly message + retry button on API failures
- [ ] Offline detection: show banner if no internet

### Task 6.2 — Voice UX Polish
- [ ] Pulse animation on mic button while listening (green ring)
- [ ] "Thinking..." animation between user message and AI response
- [ ] Smooth sentence-by-sentence TTS — no awkward pauses
- [ ] Stop button is always visible and reachable when AI is speaking

### Task 6.3 — Manual QA Checklist
- [ ] Conversation remembers context across 10+ turns
- [ ] Stop button halts speech within 100ms
- [ ] Mic activates correctly after Stop
- [ ] OCR correctly reads handwritten JEE-style equations
- [ ] Send Image gives complete solution with steps
- [ ] Auth: protected routes redirect to sign-in
- [ ] Webhook: new user appears in Supabase after sign-up

### Task 6.4 — Student Beta Testing
- [ ] Test with 5 real students (JEE/NEET aspirants)
- [ ] Key questions: Does the Socratic mode frustrate or help? Is voice latency acceptable?
- [ ] Capture feedback on conversation quality
- [ ] Fix top 3 issues before calling prototype done

---

## 🟡 Phase 7 — Launch Upgrades (Post-Prototype)

These are NOT in scope for prototype. Add after student validation.

- [ ] Replace Web Speech API with `@xenova/transformers` + `whisper-base` WASM (Hinglish)
- [ ] Replace SpeechSynthesis with Piper TTS WASM (natural voice)
- [ ] Add Vosk WASM wake-word "Hey Tutor" (no mic button needed)
- [ ] Add COOP/COEP headers to `next.config.mjs` for SharedArrayBuffer
- [ ] Build Web Worker manager for WASM model loading + IndexedDB cache
- [ ] Implement Supabase pgvector RAG for JEE/NEET coaching material
- [ ] Ingest JEE/NEET question bank into embeddings table
- [ ] Add RAG lookup in `/api/chat` before Gemini call
- [ ] ESP32 WebSocket/WebRTC integration (replace webcam)
- [ ] Analytics engine (syllabus tracker, flow tracker)
- [ ] Parental dashboard
