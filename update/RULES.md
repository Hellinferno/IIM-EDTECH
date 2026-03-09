# Developer Rules & Constraints

---

## Rule 1 — The Socratic Mandate (Absolute, Never Break)

**Never generate direct answers.** Under no circumstances should any prompt allow `gemini-2.0-flash` to output the final answer to a mathematical, scientific, or logical question. All prompts must enforce guided questioning.

```
❌ Violation:   "The answer is x = 4."
✅ Correct:     "Look at your integration limits. What happens when you substitute 0 into the equation?"
```

The `SYSTEM_PROMPT` in `lib/gemini.ts` is the enforcer. It must be injected on every single call to `/api/chat`. Removing or softening it — even temporarily for testing — is a critical bug.

---

## Rule 2 — Conversation History is Mandatory

Every call to `/api/chat` **must** include the full `messages[]` array. Never send a single isolated prompt. The AI must always have full session context to give coherent, progressive Socratic guidance.

```typescript
// ❌ Wrong — single prompt, no memory
body: JSON.stringify({ prompt: userMessage })

// ✅ Correct — full history every time
body: JSON.stringify({ messages: [...conversationHistory, newMessage] })
```

Losing conversation history mid-session is considered a UX-breaking bug.

---

## Rule 3 — Interrupt Must Be Instantaneous

The conversational flow must feel like talking to a human. When the student presses Stop (prototype) or speaks over the AI (launch), the response must halt **immediately**.

```typescript
// Correct implementation
const abortController = new AbortController();
abortRef.current = abortController;

// Both must fire together — never one without the other
window.speechSynthesis.cancel();           // stops TTS audio immediately
abortController.abort();                   // cancels streaming fetch
```

A half-second delay before stopping is considered a bug.

---

## Rule 4 — Gemini Model String

Always use `gemini-2.0-flash` as the model string. This is the correct, currently available model.

```typescript
// ❌ Wrong — model does not exist
const model = genAI.getGenerativeModel({ model: "gemini-3" });
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// ✅ Correct
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

---

## Rule 5 — RAG Before Gemini (Launch Only — NOT Prototype)

At launch, `/api/chat/route.ts` must attempt a **RAG lookup in Supabase pgvector** before calling Gemini. Bypassing the RAG cache for standard coaching questions will exponentially inflate API costs.

> ⚠️ **Prototype exception:** Call Gemini directly. Do not implement RAG until the core conversational feature is working and tested. Adding RAG before the prototype is validated wastes days of development time.

---

## Rule 6 — WASM Weights Must Never Be in Git (Launch)

Do NOT commit AI model weights (`.bin`, `.onnx`, `.pt` files) to the Git repository. Vercel will reject the build.

- All weights must be fetched at runtime from an external CDN (HuggingFace / S3)
- Cached in the browser via **IndexedDB** after first load
- Add all model file extensions to `.gitignore`

```gitignore
# AI model weights — never commit
*.bin
*.onnx
*.pt
*.wasm
/public/models/
```

> ⚠️ **Prototype exception:** We use browser native Web Speech API + SpeechSynthesis — no WASM weights needed at all.

---

## Rule 7 — COOP/COEP Headers (Launch Only)

WASM-based audio processing (Whisper, Piper) requires `SharedArrayBuffer`, which requires Cross-Origin Isolation headers.

```javascript
// next.config.mjs — add at launch when WASM voice is introduced
headers: async () => [{
  source: '/(.*)',
  headers: [
    { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
    { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  ]
}]
```

> ⚠️ Do NOT add these headers in the prototype — they break many third-party scripts and Clerk's auth pop-ups.

---

## Rule 8 — TypeScript Strictness (Always)

The project uses `strict: true` TypeScript. No exceptions.

```typescript
// ❌ Never use `any`
const response: any = await fetch('/api/chat');

// ✅ Always type properly
interface ChatResponse {
  content: string;
  done: boolean;
}
const response: ChatResponse = await fetch('/api/chat').then(r => r.json());
```

Type all: API request/response bodies, Supabase row types (use generated types from `supabase gen types`), Gemini SDK payloads, React state.

---

## Rule 9 — Image Cleanup is Mandatory

Every image uploaded to Supabase Storage must be deleted immediately after Gemini processes it. Never let images accumulate.

```typescript
// Always in a try/finally block so cleanup runs even if Gemini fails
try {
  await supabase.storage.from('images').upload(fileName, buffer);
  result = await callGemini(base64Image);
} finally {
  await supabase.storage.from('images').remove([fileName]);
}
```

---

## Rule 10 — Mistake Categorization in Every Response

The Socratic system prompt must instruct Gemini to silently identify the mistake type before responding. This shapes the hint quality.

| Mistake Type | AI Behavior |
|---|---|
| **Conceptual** | Ask a question that reveals the gap in understanding |
| **Procedural** | Point to which step went wrong without showing the fix |
| **Calculation** | Ask them to recheck a specific number or operation |
| **Reading** | Ask them to re-read the question and identify units/constraints |
