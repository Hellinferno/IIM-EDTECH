# Tech Stack
## Project: ClarityAI — Prototype v0.1
**Stage:** Prototype | **Last Updated:** March 2026

---

## Philosophy

> **API-first. Free tier only. No credit card required. Ship fast.**

Every API used in this prototype has a generous free tier accessible with just a Google account. No billing setup, no credit card, no surprise invoices.

---

## 1. AI — Everything Through One Free API

| Capability | API | Free Tier |
|---|---|---|
| Conversational AI | **Google Gemini API** (`gemini-1.5-flash`) | 15 RPM, 1M tokens/day — free |
| Vision / Image Analysis | **Google Gemini API** (Vision) | Same free tier — reads images natively |
| Live OCR from camera frame | **Google Gemini API** (Vision) | Send frame as image, extract text |
| AI Response Streaming | **Gemini Streaming API** | Supported, same free tier |

> **One API. One key. Zero cost.**  
> Get your free key at: [aistudio.google.com](https://aistudio.google.com) — no credit card needed.

**Why Gemini over other free options:**
- Gemini 1.5 Flash is genuinely fast and capable for educational Q&A
- Handles vision natively — reads images, diagrams, handwriting
- 1 million free tokens/day is more than enough for a prototype with hundreds of users
- No billing account required — just a Google account

---

## 2. Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Full-stack in one repo; deploys free on Vercel |
| Language | **TypeScript** | Type safety across the whole stack |
| Styling | **Tailwind CSS** | Utility-first, fast to iterate |
| UI Components | **shadcn/ui** | Accessible primitives, we control visuals |
| Fonts | **Geist** (Vercel) | Clean, purpose-built for web apps |
| Animation | **Framer Motion** | Smooth transitions for chat + mode switching |
| Camera Access | **Browser MediaDevices API** | Native — no library needed |
| Icons | **Lucide React** | Minimal, consistent |

---

## 3. Auth

| Service | **Clerk** |
|---|---|
| Free tier | 10,000 MAU — free, no credit card |
| Why | Fully managed. Email + Google sign-in. No auth code to write. |
| Integration | `@clerk/nextjs` middleware protects all routes |

---

## 4. Database & Storage

| Layer | Service | Free Tier |
|---|---|---|
| Database | **Supabase** (PostgreSQL) | 500MB DB, 2 projects — free |
| Storage | **Supabase Storage** | 1GB — free |
| Session state | **React state (in-memory)** | No DB needed for prototype messages |

> For the prototype, only user accounts are stored in Supabase. All chat messages live in React state and reset on page refresh — no persistence infrastructure needed yet.

---

## 5. Deployment

| Service | Free Tier |
|---|---|
| **Vercel** | Hobby plan — unlimited deployments, free SSL, free CDN |

---

## 6. Full Cost Breakdown

| Service | Plan | Monthly Cost |
|---|---|---|
| Gemini API (Google AI Studio) | Free tier (1M tokens/day) | **$0** |
| Clerk | Free tier (10K MAU) | **$0** |
| Supabase | Free tier | **$0** |
| Vercel | Hobby (free) | **$0** |
| **Total** | | **$0/month** |

---

## 7. Environment Variables

```bash
# Google Gemini (get free key at aistudio.google.com)
GEMINI_API_KEY=

# Clerk (free at clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase (free at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 8. Project Structure

```
clarityai/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (app)/
│   │   ├── page.tsx                ← Home (mode selector)
│   │   ├── live-ocr/page.tsx       ← Live OCR mode
│   │   └── send-image/page.tsx     ← Send Image mode
│   └── api/
│       ├── ocr/route.ts            ← Gemini Vision OCR endpoint
│       ├── chat/route.ts           ← Gemini streaming chat endpoint
│       └── image/route.ts          ← Gemini Vision image analysis
├── components/
│   ├── ui/                         ← shadcn primitives
│   ├── chat/                       ← ChatBubble, ChatInput, StreamingText
│   ├── camera/                     ← CameraPreview, FrameCapture
│   └── image-upload/               ← Dropzone, ImagePreview
├── lib/
│   ├── gemini.ts                   ← Gemini client + all AI functions
│   ├── supabase.ts                 ← Supabase client
│   └── prompts/
│       ├── live-ocr.ts             ← Guided (no-answer) system prompt
│       └── send-image.ts           ← Direct answer system prompt
├── hooks/
│   ├── useCamera.ts                ← Frame capture logic
│   ├── useOCR.ts                   ← OCR polling + debounce
│   └── useChat.ts                  ← Chat state + streaming handler
└── types/index.ts
```

---

## 9. What We're NOT Using (and Why)

| Skipped | Reason |
|---|---|
| Anthropic Claude | Requires credit card |
| Google Cloud Vision API | Requires billing account — replaced by Gemini Vision |
| OpenAI | Requires credit card |
| Tesseract.js | Worse accuracy; Gemini Vision handles OCR better |
| Redis / Upstash | Overkill for prototype |
| Separate Express/Fastify server | Next.js API routes handle everything |
| React Native / Expo | Web-first; mobile browser is enough for prototype |
| Docker | Vercel handles deployment |
