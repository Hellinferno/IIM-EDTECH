# System Architecture

> **Scope Legend**
> - 🟢 **Prototype** — Current architecture
> - 🟡 **Launch** — Upgrade path

---

## Overview — Hybrid Tiered System

```
[Student's Laptop/Phone]          [Vercel Cloud]           [Supabase Cloud]
        │                               │                         │
  Browser (Next.js)                API Routes               PostgreSQL + pgvector
  ┌─────────────────┐              ┌──────────┐             ┌─────────────────┐
  │ Web Speech API  │──── voice ──▶│ /api/chat│──── RAG ───▶│ Embeddings      │
  │ SpeechSynthesis │              │          │◀── hints ───│ (🟡 Launch)     │
  │ useCamera hook  │──── image ──▶│ /api/ocr │             └─────────────────┘
  │ messages[] state│              │ /api/image│──── Gemini API ──▶ gemini-2.0-flash
  └─────────────────┘              └──────────┘
        │
  [🟡 Launch: ESP32 Lamp]
  Streams video + audio
  over local WebSocket/WebRTC
```

---

## 1. Prototype Architecture (What to Build Now)

### Input Sources
- **Camera:** Laptop webcam via `getUserMedia()` — no hardware needed
- **Voice:** Browser `Web Speech API` — mic button triggers recording
- **Image upload:** File input for Send Image mode

### Conversational Flow (Core New Feature)

```
1. Student presses [Mic] button
   └─→ SpeechRecognition.start() captures voice
   └─→ On result: transcript text extracted

2. Frontend sends to POST /api/chat:
   {
     messages: [
       { role: "user", content: "What is the formula here?" },
       { role: "assistant", content: "Look at the power rule — what does that exponent tell you?" },
       { role: "user", content: "Is it 2x?" }   ← new message appended
     ],
     image: "<base64 if camera frame captured>"   ← optional
   }

3. Gemini gemini-2.0-flash streams response tokens
   └─→ Tokens aggregated into sentences
   └─→ Each complete sentence pushed to SpeechSynthesis.speak()

4. Student presses [Stop] at any point:
   └─→ speechSynthesis.cancel()
   └─→ AbortController.abort() cancels the fetch
   └─→ Mic button re-enabled immediately
```

### State Management (React — No DB for Prototype)

```typescript
// Stored in React useState only — resets on page refresh
const [messages, setMessages] = useState<Message[]>([]);
const [isListening, setIsListening] = useState(false);
const [isSpeaking, setIsSpeaking] = useState(false);
const [isThinking, setIsThinking] = useState(false);

// Abort controller ref — recreated each turn
const abortRef = useRef<AbortController | null>(null);
```

---

## 2. Backend Reasoning Pipeline

### Prototype: Direct Gemini (No RAG)

```
POST /api/chat
  │
  ├─→ Validate messages[] array (must not be empty)
  ├─→ Extract latest user message
  ├─→ If image present: attach as base64 part to Gemini request
  ├─→ Inject SYSTEM_PROMPT (Socratic rules)
  ├─→ Call gemini-2.0-flash with full messages[] history
  └─→ Stream tokens back to frontend via ReadableStream
```

### 🟡 Launch: RAG-First Pipeline

```
POST /api/chat
  │
  ├─→ Hash / embed the OCR text or user question
  ├─→ Query Supabase pgvector for semantic match
  │     ├─→ HIT: Return cached Socratic hints (cost: ~$0)
  │     └─→ MISS: Fall through to Gemini API
  └─→ gemini-2.0-flash with full messages[] + SYSTEM_PROMPT
```

> ⚠️ Do NOT implement RAG in the prototype. It requires ingesting JEE/NEET question banks before a single chat message can be tested.

---

## 3. API Route Contracts

### `POST /api/chat`

**Request:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  image?: string;  // base64 encoded, optional
}
```

**Response:** `ReadableStream` — streaming text tokens

---

### `POST /api/ocr`

**Request:**
```typescript
{
  frame: string;  // base64 camera frame
}
```

**Response:**
```typescript
{
  text: string;  // extracted text from image
}
```

---

### `POST /api/image`

**Request:**
```typescript
{
  image: string;     // base64 uploaded photo
  question?: string; // optional voice/text question about the image
}
```

**Response:** `ReadableStream` — full step-by-step solution

---

## 4. Supabase Schema (Prototype)

```sql
-- Users table (synced from Clerk via webhook)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (clerk_id = auth.uid()::text);
```

```sql
-- 🟡 Launch: Add these for RAG
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  subject     TEXT,               -- 'Physics', 'Chemistry', 'Maths'
  topic       TEXT,               -- 'Kinematics', 'Organic Chemistry'
  hints       JSONB,              -- array of Socratic hints
  embedding   vector(768),        -- pgvector column
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

---

## 5. Supabase Storage

- **Bucket name:** `images` (private)
- **Policy:** Service role only (never expose to browser directly)
- **Lifecycle:** Delete immediately after Gemini processes

```typescript
// In /api/image route — always clean up
const { data } = await supabase.storage.from('images').upload(fileName, buffer);
const geminiResponse = await callGemini(base64Image);
await supabase.storage.from('images').remove([fileName]);  // ← always delete
return geminiResponse;
```

---

## 6. 🟡 Launch: ESP32 Hardware Integration

Once prototype is validated by real students, replace webcam with ESP32 lamp:

1. ESP32 powers on → connects to student's local Wi-Fi
2. Streams video frames + raw audio over local **WebSocket/WebRTC**
3. Next.js frontend connects to `ws://[lamp-ip]:8080`
4. Replace `getUserMedia()` in `useCamera` hook with WebSocket frame receiver
5. Audio from ESP32 mic fed to Whisper WASM (replaces Web Speech API)
