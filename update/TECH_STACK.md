# Technology Stack

> **Scope Legend**
> - 🟢 **Prototype** — Used now
> - 🟡 **Launch** — Upgrade to this before public release
> - 🔴 **Later** — Post-launch consideration

---

## 1. Frontend — App & Processing Hub

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | |
| Language | TypeScript (strict mode) | No `any` types |
| Styling | Tailwind CSS | Core utility classes only |
| Animations | Framer Motion | Listening / Thinking / Speaking state indicators |
| Deployment | Vercel (Hobby — free) | |

---

## 2. Voice Pipeline

### 🟢 Prototype — Browser Native (Zero Setup, Zero Cost)

| Function | Technology | How to Use |
|---|---|---|
| Speech-to-Text | `Web Speech API` | `new SpeechRecognition()` — built into Chrome/Edge |
| Text-to-Speech | `Web SpeechSynthesis API` | `window.speechSynthesis.speak()` — built into all browsers |
| Interrupt / Cancel | UI Stop button | `speechSynthesis.cancel()` + `AbortController.abort()` |

> ⚠️ Web Speech API requires internet (sends audio to Google's servers). Works fine for prototype. Switch to WASM at launch for offline + Hinglish support.

---

### 🟡 Launch — Edge WASM (Offline, Private, Hinglish-Ready)

| Function | Technology | Notes |
|---|---|---|
| Wake-word Detection | `vosk-browser` (WASM) | Runs in Web Worker, always-on "Hey Tutor" |
| Speech-to-Text | `@xenova/transformers` + `whisper-base` | Full Hinglish support, runs via WebGPU/WASM |
| Text-to-Speech | Piper TTS (WASM) | Warm, natural "elder sibling" voice, <200ms latency |
| Interrupt Handler | `AbortController` | Tied to Vosk voice trigger — fires synchronously |

> Model weights (~40–150MB) are fetched from HuggingFace/S3 CDN on first load and cached in browser IndexedDB. Never committed to Git.

---

## 3. AI — Vision & Reasoning

| Layer | Technology | Notes |
|---|---|---|
| Model | `gemini-2.0-flash` | Free on AI Studio, multimodal, handles complex STEM diagrams |
| Client | `@google/generative-ai` SDK | |
| API file | `lib/gemini.ts` | Centralized client, streaming enabled |
| Conversation | `messages[]` array passed every request | Full multi-turn context, never single-shot prompts |

> ❌ "Gemini 3" does not exist. Always use `gemini-2.0-flash` as the model string.

---

## 4. Backend

| Layer | Technology | Notes |
|---|---|---|
| API Routes | Next.js Serverless Edge Functions | `/api/chat`, `/api/ocr`, `/api/image` |
| Auth | Clerk (free tier — 10K MAU) | Webhook for user sync to Supabase |
| Database | Supabase PostgreSQL | `users` table for prototype |
| Vector DB (RAG) | Supabase `pgvector` extension | 🟡 Launch — for coaching material cache |
| File Storage | Supabase Storage | Images deleted immediately after Gemini processes |

---

## 5. API Routes Summary

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Conversational Socratic tutor — accepts `messages[]` + optional image |
| `/api/ocr` | POST | Extracts text from live camera frame via Gemini Vision |
| `/api/image` | POST | Full solution for uploaded image (Send Image mode) |
| `/api/webhooks/clerk` | POST | Syncs new Clerk user → Supabase `users` table |

---

## 6. Environment Variables

```bash
# AI
GEMINI_API_KEY=                          # aistudio.google.com → Get API Key

# Auth — Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=       # dashboard.clerk.com → API Keys → Publishable key (pk_test_...)
CLERK_SECRET_KEY=                        # dashboard.clerk.com → API Keys → Secret key (sk_test_...)
CLERK_WEBHOOK_SECRET=                    # dashboard.clerk.com → Webhooks → Add Endpoint → Signing Secret (whsec_...)

# Database — Supabase
NEXT_PUBLIC_SUPABASE_URL=               # supabase.com → Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # supabase.com → Project Settings → API → anon/public key
SUPABASE_SERVICE_ROLE_KEY=              # supabase.com → Project Settings → API → service_role key (NEVER expose publicly)
```

---

## 7. Hardware (Lamp — Post-Prototype)

| Component | Details |
|---|---|
| Microcontroller | ESP32-S3 WROOM (handles camera + audio routing) |
| Camera | 5MP OV5640 |
| Connection to App | WebRTC or WebSocket — streams local video/audio to Next.js client |

> Prototype uses laptop webcam via `getUserMedia()`. ESP32 integration happens after student validation.
