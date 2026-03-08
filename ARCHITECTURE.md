# System Architecture
## Project: ClarityAI — Prototype v0.1
**Stage:** Prototype | **Last Updated:** March 2026

---

## 1. High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER / MOBILE WEB                      │
│                      (Next.js App)                           │
│                                                              │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │     LIVE OCR MODE       │  │    SEND IMAGE MODE       │  │
│  │                         │  │                          │  │
│  │  Camera (MediaDevices)  │  │  File Upload / Snap      │  │
│  │  Capture frame (JPEG)   │  │  Image → base64          │  │
│  │  every 3 seconds        │  │                          │  │
│  └────────────┬────────────┘  └────────────┬─────────────┘  │
│               │                            │                 │
│               ▼                            ▼                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           SHARED CHAT INTERFACE                      │    │
│  │   Streaming text display + message input             │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
               │                            │
      POST /api/ocr               POST /api/image
      POST /api/chat               POST /api/chat
               │                            │
               ▼                            ▼
┌──────────────────────────────────────────────────────────────┐
│           NEXT.JS API ROUTES  (Vercel Edge Functions)        │
│                                                              │
│   /api/ocr    → Extract text from camera frame               │
│   /api/image  → Analyze uploaded image, return full answer   │
│   /api/chat   → Conversational follow-up messages            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │    Google Gemini API          │
               │  (via Google AI Studio)       │
               │                              │
               │  Model: gemini-1.5-flash      │
               │                              │
               │  • Chat with system prompt    │
               │  • Vision (read images)       │
               │  • OCR (extract text from     │
               │    camera frame image)        │
               │  • Streaming responses        │
               │                              │
               │  FREE — no credit card        │
               └──────────────────────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │         Supabase             │
               │  PostgreSQL: users table     │
               │  Storage: temp image upload  │
               │  (1-hour auto-delete)        │
               └──────────────────────────────┘
```

---

## 2. Live OCR Mode — Data Flow

```
Camera open
    │
    ▼
useCamera() hook
navigator.mediaDevices.getUserMedia({ video: true })
    │
    ▼
Every 3 seconds:
  Capture frame from <video> element
  Draw to offscreen <canvas>
  canvas.toDataURL('image/jpeg', 0.6)
  → base64 JPEG string
    │
    ▼
POST /api/ocr  { image: base64 }
    │
    ▼
Gemini Vision call:
  model.generateContent([
    { inlineData: { mimeType: "image/jpeg", data: base64 } },
    "Extract only the text visible in this image. Return plain text only."
  ])
    │
    ▼
Text returned e.g. "Solve: 2x + 5 = 13"
    │
Compare with previous OCR result
    │
  Same? → skip
    │
  Different?
    │
    ▼
Update "detected text" card in UI  (fade animation)
    │
    ▼
POST /api/chat
{
  mode: "live_ocr",
  ocrText: "Solve: 2x + 5 = 13",
  history: [ ...previous messages ]
}
    │
    ▼
Gemini Chat call (streaming):
  System: GUIDED prompt (no direct answers)
  User: "[OCR text] + student message"
    │
    ▼
Tokens stream → UI in real-time
"Good! What do you think the first step should be?"
```

---

## 3. Send Image Mode — Data Flow

```
User selects image
    │
    ▼
FileReader.readAsDataURL(file) → base64
    │
    ▼
Image preview shown in UI
    │
    ▼
POST /api/image  { image: base64, mimeType: "image/jpeg" }
    │
    ▼
Upload to Supabase Storage (temp, 1hr TTL)
    │
    ▼
Gemini Vision call (streaming):
  model.generateContentStream([
    { inlineData: { mimeType: "image/jpeg", data: base64 } },
    DIRECT_ANSWER_PROMPT
  ])
    │
    ▼
Streaming tokens → UI
Full step-by-step solution displayed
    │
    ▼
ChatInput appears for follow-up questions
    │
POST /api/chat with full conversation history
    │
Gemini Chat (streaming) → response
```

---

## 4. Gemini Client (`/lib/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Extract text from a camera frame image
export async function extractTextFromFrame(base64: string): Promise<string> {
  const result = await model.generateContent([
    {
      inlineData: { mimeType: "image/jpeg", data: base64 }
    },
    "Extract only the visible text from this image. Return plain text only, no formatting."
  ]);
  return result.response.text();
}

// Stream a chat response (with optional image for Send Image mode)
export async function* streamChat(
  messages: Message[],
  systemPrompt: string,
  image?: { base64: string; mimeType: string }
): AsyncGenerator<string> {
  const chat = model.startChat({
    systemInstruction: systemPrompt,
    history: messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }))
  });

  const lastMessage = messages[messages.length - 1];
  const parts: any[] = [];

  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  parts.push({ text: lastMessage.content });

  const result = await chat.sendMessageStream(parts);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
```

---

## 5. Streaming to the Browser (SSE)

```
Browser                  Next.js Route             Gemini API
   │                          │                        │
   │  POST /api/chat          │                        │
   │ ───────────────────────► │                        │
   │                          │  streamChat()          │
   │                          │ ──────────────────────►│
   │                          │                        │
   │                          │◄── chunk "What do"     │
   │◄── data: "What do"       │                        │
   │                          │◄── chunk " you think"  │
   │◄── data: " you think"    │                        │
   │                          │◄── [DONE]              │
   │◄── data: [DONE]          │                        │

// API Route handler:
export async function POST(req: Request) {
  const { messages, mode, ocrText } = await req.json();
  const systemPrompt = mode === 'live_ocr' ? liveOcrPrompt : sendImagePrompt;

  const stream = new ReadableStream({
    async start(controller) {
      for await (const token of streamChat(messages, systemPrompt)) {
        controller.enqueue(new TextEncoder().encode(token));
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

---

## 6. Prompt Architecture

### `/lib/prompts/live-ocr.ts` — Guided Mode
```
You are a friendly, patient tutor helping a student who is pointing
their camera at a question or their notes.

YOUR RULES:
- NEVER give the direct answer to any question. This is the most important rule.
- Always guide with Socratic questions: "What formula applies here?"
- If you spot a mistake, point it out without correcting it: 
  "Take another look at step 2 — does that sign look right?"
- Keep responses SHORT: 2–4 sentences unless the student asks for more.
- Use simple analogies when explaining concepts.
- Stay warm and encouraging. Never make the student feel dumb.
- Gently redirect off-topic messages back to the question.
- The OCR text from their camera is included in each message as context.
```

### `/lib/prompts/send-image.ts` — Direct Mode
```
You are an expert tutor. The student has uploaded a question image.

YOUR RULES:
- Provide a COMPLETE, numbered, step-by-step solution.
- After each step briefly explain WHY: "We divide both sides to isolate x."
- End with: "This uses the concept of [name the method or theorem]."
- If the image is unclear or unreadable, ask politely for a retake.
- If you're not sure about something, say so — never guess or fabricate.
```

---

## 7. Data Model

Only one table needed for the prototype:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Chat messages → **React state only** (reset on page refresh, no DB)  
Uploaded images → **Supabase Storage** (auto-deleted after 1 hour)

---

## 8. Cost

| Service | Free Tier Limits | Usage at 100 beta users |
|---|---|---|
| Gemini API | 1M tokens/day, 15 req/min | ~Well within limits |
| Clerk | 10,000 MAU | Fine for prototype |
| Supabase | 500MB DB, 1GB storage | Fine for prototype |
| Vercel | Unlimited hobby deploys | Fine for prototype |
| **Total** | | **$0/month** |
