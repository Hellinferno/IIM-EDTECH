# Tasks
## Project: ClarityAI — Prototype v0.1
**Stage:** Prototype | **Last Updated:** March 2026

> Estimated total: **~17 days** solo / ~10 days with two devs  
> Total cost: **$0** — all free tier APIs

---

## PHASE 1 — Setup & Scaffold (Days 1–3)

### TASK-001 · Project Initialization
- [ ] Create Next.js 14 app with TypeScript and App Router:
  ```bash
  npx create-next-app@latest clarityai --typescript --tailwind --app
  cd clarityai
  ```
- [ ] Install dependencies:
  ```bash
  npm install @google/generative-ai
  npm install @clerk/nextjs
  npm install @supabase/supabase-js
  npm install framer-motion lucide-react
  npx shadcn-ui@latest init
  ```
- [ ] Create `.env.local` (copy from `.env.example`)
- [ ] Initialize Git repo, push to GitHub
- [ ] Connect repo to Vercel; confirm auto-deploy works

**Est: 0.5 days**

---

### TASK-002 · Get Free API Keys
- [ ] **Gemini API** — Go to [aistudio.google.com](https://aistudio.google.com) → "Get API Key" → Create key in new project. No credit card. Add as `GEMINI_API_KEY`.
- [ ] **Clerk** — Sign up at [clerk.com](https://clerk.com) → Create application → Enable Email + Google. Add publishable key + secret key.
- [ ] **Supabase** — Sign up at [supabase.com](https://supabase.com) → New project → Copy URL + anon key + service role key.
- [ ] Add all keys to `.env.local`
- [ ] Add placeholder values to `.env.example` (commit this, not `.env.local`)

**Est: 0.5 days**

---

### TASK-003 · Auth with Clerk
- [ ] Wrap `layout.tsx` in `<ClerkProvider>`
- [ ] Add Clerk middleware (`middleware.ts`) to protect `/app/*` and `/api/*`
- [ ] Build `/sign-in/page.tsx` using `<SignIn />` component
- [ ] Build `/sign-up/page.tsx` using `<SignUp />` component
- [ ] Redirect authenticated users to home (`/`)
- [ ] Add user avatar + sign-out button to app header
- [ ] **Test:** Visit `/live-ocr` without signing in → should redirect to `/sign-in`

**Est: 1 day**

---

### TASK-004 · Supabase Setup
- [ ] In Supabase dashboard, run:
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] Create Storage bucket named `images`; set object expiry to 3600 seconds (1 hour)
- [ ] Create Clerk webhook → POST to `/api/webhooks/clerk` → sync new user to `users` table
- [ ] **Test:** Sign up a new user, confirm row appears in Supabase `users` table

**Est: 0.5 days**

---

### TASK-005 · Home Screen
- [ ] Build `/app/page.tsx`
- [ ] Two large mode cards: "Live OCR" and "Send Image"
- [ ] Each card: icon, title, one-line description
- [ ] Framer Motion scale animation on hover
- [ ] Header: app name (left) + user avatar / sign-out (right)
- [ ] Fully mobile responsive (cards stack vertically on small screens)
- [ ] Clean, minimal — no decorative elements

**Est: 0.5 days**

---

## PHASE 2 — Gemini AI Infrastructure (Days 4–6)

### TASK-006 · Gemini Client (`/lib/gemini.ts`)
- [ ] Install SDK: `npm install @google/generative-ai`
- [ ] Initialize `GoogleGenerativeAI` with `GEMINI_API_KEY`
- [ ] Create `extractTextFromFrame(base64: string): Promise<string>`
  - Sends JPEG frame to Gemini Vision
  - Returns plain text only (no formatting)
  - Handles empty / no text detected
- [ ] Create `streamChat(messages, systemPrompt, image?): AsyncGenerator<string>`
  - Builds chat history in Gemini format (`user` / `model` roles)
  - Accepts optional image for Send Image mode
  - Yields tokens as they stream
- [ ] **Test:** Call both functions manually with a test image and a test question

**Est: 1 day**

---

### TASK-007 · System Prompts (`/lib/prompts/`)
- [ ] Write `/lib/prompts/live-ocr.ts` — Guided mode (no direct answers, Socratic)
- [ ] Write `/lib/prompts/send-image.ts` — Direct mode (full step-by-step solution)
- [ ] **Prompt testing (do this before writing API routes):**
  - Test 5 math questions in guided mode → confirm no direct answers given
  - Test 5 questions in direct mode → confirm all steps shown
  - Test 1 blurry/unreadable image → confirm graceful response
  - Test 1 off-topic message in guided mode → confirm redirect
- [ ] Iterate prompts until all 12 test cases pass
- [ ] Document any known prompt weaknesses in `KNOWN_ISSUES.md`

**Est: 1 day**

---

### TASK-008 · `/api/chat` Route
- [ ] Create `/app/api/chat/route.ts`
- [ ] Validate Clerk auth (`auth().userId`) → return 401 if missing
- [ ] Accept: `{ messages: Message[], mode: string, ocrText?: string }`
- [ ] If `mode === 'live_ocr'` and `ocrText` exists → prepend OCR text to user message as context
- [ ] Load correct system prompt based on `mode`
- [ ] Call `streamChat()` → pipe SSE stream back to client
- [ ] Return clean error messages (not raw stack traces)
- [ ] **Test:** Send a POST with Postman / curl → confirm streaming tokens arrive

**Est: 0.5 days**

---

### TASK-009 · `/api/ocr` Route
- [ ] Create `/app/api/ocr/route.ts`
- [ ] Validate Clerk auth → return 401 if missing
- [ ] Accept: `{ image: string }` (base64 JPEG)
- [ ] Validate: non-empty string
- [ ] Call `extractTextFromFrame(image)` from `/lib/gemini.ts`
- [ ] Return: `{ text: string }` (empty string if nothing detected)
- [ ] **Test:** POST a base64 image → confirm text is returned

**Est: 0.5 days**

---

### TASK-010 · `/api/image` Route
- [ ] Create `/app/api/image/route.ts`
- [ ] Validate Clerk auth → return 401 if missing
- [ ] Accept multipart form data with image file
- [ ] Validate: size < 10MB, format is JPG/PNG/WEBP/HEIC
- [ ] Upload to Supabase Storage (temp bucket)
- [ ] Read image as base64
- [ ] Call `streamChat()` with image + send-image system prompt
- [ ] Stream response back to client
- [ ] **Test:** Upload a photo of a textbook question → confirm full answer streams back

**Est: 0.5 days**

---

## PHASE 3 — Live OCR Mode (Days 7–11)

### TASK-011 · Camera Hook (`/hooks/useCamera.ts`)
- [ ] `startCamera()` → `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- [ ] `stopCamera()` → stop all media tracks, clear video srcObject
- [ ] `captureFrame()` → draw video to canvas, return base64 JPEG at 0.6 quality
- [ ] Handle permission denied → expose `permissionError` boolean
- [ ] Handle no camera available → expose `noCameraAvailable` boolean
- [ ] **Test on:** Chrome desktop, Safari iOS, Chrome Android

**Est: 1 day**

---

### TASK-012 · OCR Polling Hook (`/hooks/useOCR.ts`)
- [ ] Call `captureFrame()` every 3000ms via `setInterval`
- [ ] POST frame to `/api/ocr`
- [ ] Compare result with `previousText` → skip if identical
- [ ] Expose: `detectedText: string`, `isScanning: boolean`
- [ ] Auto-stop interval when `stopCamera()` is called
- [ ] Show `"Point camera at text to begin"` hint when `detectedText` is empty

**Est: 0.5 days**

---

### TASK-013 · Chat Components (`/components/chat/`)
- [ ] `ChatBubble` — user (right-aligned, filled) vs assistant (left-aligned, outlined)
- [ ] `StreamingText` — text appears token-by-token with cursor blink
- [ ] `TypingIndicator` — animated 3-dot pulse while AI is generating
- [ ] `ChatInput` — textarea + send button; Enter to send; Shift+Enter for newline; clears on send
- [ ] `ChatThread` — scrollable container; auto-scrolls to bottom on new message
- [ ] All components minimal and clean — no shadows, no rounded excess, neutral palette

**Est: 1 day**

---

### TASK-014 · Live OCR Screen (`/app/(app)/live-ocr/page.tsx`)
- [ ] Layout: camera preview (top 50%) + chat panel (bottom 50%)
- [ ] Camera fills its section — no extra chrome or borders
- [ ] Floating OCR card over camera bottom edge: shows `detectedText` (max 200 chars, truncated)
- [ ] OCR card fades smoothly when text changes
- [ ] When OCR detects text for the first time → auto-send to `/api/chat` to get first AI message
- [ ] `ChatThread` + `ChatInput` in bottom panel
- [ ] Streaming AI response displayed in real-time
- [ ] "End Session" button (top right): stops camera, clears chat
- [ ] **Permission denied state:** full-screen message: "Camera access is needed. Please allow camera access in your browser settings."
- [ ] **Mobile:** camera and chat each take 50vh; both scrollable

**Est: 2 days**

---

## PHASE 4 — Send Image Mode (Days 12–15)

### TASK-015 · Image Upload Component (`/components/image-upload/`)
- [ ] `ImageUpload`: drag-and-drop area + "Choose File" button
- [ ] On mobile: "Take Photo" is the primary CTA (uses `capture="environment"` on file input)
- [ ] After selection: show image preview + "Analyze" button
- [ ] "Change image" resets to upload state
- [ ] Validate on client: max 10MB, accepted formats (JPG, PNG, WEBP)
- [ ] Clear error states for invalid files

**Est: 0.5 days**

---

### TASK-016 · Send Image Screen (`/app/(app)/send-image/page.tsx`)
- [ ] Initial state: `ImageUpload` centered on screen
- [ ] After image selected: preview visible + "Analyze" button
- [ ] On submit: show skeleton loader while streaming begins
- [ ] Answer streams into `ChatThread` below the image
- [ ] Image stays pinned at top throughout conversation
- [ ] `ChatInput` appears once streaming completes
- [ ] Follow-up messages POST to `/api/chat` with conversation history
- [ ] "New Question" button: resets to upload state
- [ ] Error state: AI says image is unclear → retake prompt shown inline

**Est: 1.5 days**

---

### TASK-017 · Manual QA — Send Image
- [ ] Printed textbook question (math)
- [ ] Handwritten algebra problem
- [ ] Chemistry equation
- [ ] History/text-heavy question
- [ ] Diagram with labels
- [ ] Blurry image (expect: graceful error message)
- [ ] Non-academic image (expect: polite redirect)
- [ ] Log pass/fail in `KNOWN_ISSUES.md`

**Est: 0.5 days**

---

## PHASE 5 — Polish & Launch (Days 16–17)

### TASK-018 · UI Polish Pass
- [ ] Review every screen against UI rules in `RULES.md`
- [ ] Check whitespace consistency across all screens
- [ ] All loading states visible (no silent waits)
- [ ] All error messages are human-readable
- [ ] Test dark mode (Tailwind `dark:`)
- [ ] Test on iPhone Safari, Android Chrome, Desktop Chrome
- [ ] Fix any layout breaks below 375px width

**Est: 1 day**

---

### TASK-019 · Student Test + Beta Launch
- [ ] Test with 3–5 students (no instructions given — observe them)
- [ ] Note: where they hesitate, what they click first, when they give up
- [ ] Fix the single biggest friction point found
- [ ] Deploy production build to Vercel
- [ ] Smoke-test both modes on production URL
- [ ] Share link with 20+ students
- [ ] Add feedback form link in app footer

**Est: 0.5 days**

---

## Summary

| Phase | Tasks | Est. Days |
|---|---|---|
| Setup & Scaffold | 5 tasks | 3 days |
| Gemini AI Infrastructure | 5 tasks | 3.5 days |
| Live OCR Mode | 4 tasks | 4.5 days |
| Send Image Mode | 3 tasks | 2.5 days |
| Polish & Launch | 2 tasks | 1.5 days |
| **Total** | **19 tasks** | **~17 days** |

> **Total API cost: $0/month** — all services run on free tiers.
