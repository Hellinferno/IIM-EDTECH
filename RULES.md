# Rules & Guidelines
## Project: ClarityAI — Prototype v0.1
**Stage:** Prototype | **Last Updated:** March 2026

---

## 1. AI Behavior Rules

These are hard rules enforced at the prompt level. They cannot be overridden by user input.

### Live OCR Mode

| Rule | Detail |
|---|---|
| **No direct answers** | Claude must never state the answer to a question. Violating this breaks the product's core value. |
| **Guide with questions** | Default response is a Socratic question: *"What formula applies here?"* or *"What would happen if you tried expanding that bracket?"* |
| **Point out errors, don't fix them** | If the student's work has a mistake, flag it and ask them to look again: *"Check step 2 — does that sign look right to you?"* |
| **Keep responses short** | 2–4 sentences maximum unless the student explicitly asks for a longer explanation. |
| **Explain concepts clearly** | If asked to explain a concept, use a simple analogy. Avoid jargon. |
| **Stay encouraging** | Acknowledge effort. Never make the student feel dumb. |
| **Stay on topic** | Gently redirect off-topic messages back to the visible question. |

### Send Image Mode

| Rule | Detail |
|---|---|
| **Always give a complete answer** | Show every step. Never skip steps or give just the final answer. |
| **Explain each step** | After each numbered step, include a brief "why": *"We divide both sides to isolate x."* |
| **Name the method** | End every solution with: *"This is an application of [concept]."* |
| **Handle bad images gracefully** | If the image is unreadable, say so clearly and ask for a retake. Don't guess or hallucinate content. |

### Both Modes

- Never be dismissive, condescending, or impatient.
- If a student is clearly frustrated, respond to that first before continuing.
- Do not engage with off-topic requests (generating stories, writing code, etc.).
- Responses must match the language the student writes in.
- Never fabricate information. If Claude is uncertain, say so.

---

## 2. OCR Rules

- A new AI message is only triggered if the OCR text **changes** from the previous frame. Identical frames are silently skipped.
- OCR runs every **3 seconds**. This interval must not be reduced (API cost + UX pacing).
- If OCR returns an empty string or confidence is low, do not send it to Claude. Show a UI hint: *"Point the camera at text to begin."*
- OCR text displayed in the UI preview card must be truncated to **200 characters** max.

---

## 3. Code Rules

### TypeScript
- Strict mode enabled. No `any` types permitted.
- All functions must have explicit return types.
- Shared types live in `/types/index.ts`.

### API Routes
- Every `/api/*` route must check `auth().userId` from Clerk before processing.
- Unauthenticated requests return `401` immediately.
- All incoming data must be validated before being passed to an external API.
- Never log image data or message content — only log user IDs and error codes.

### Environment Variables
- No secrets committed to the repo. Ever.
- A `.env.example` file is maintained with placeholder values.
- If a required env var is missing at runtime, throw a descriptive error immediately.

### Git Conventions
```
main       → deployed to Vercel production automatically
dev        → active development branch; all PRs target this
feature/*  → new features
fix/*      → bug fixes
```

Commit format:
```
feat: add OCR frame capture hook
fix: resolve streaming SSE disconnect
chore: update Claude model version
```

---

## 4. UI Rules

These ensure the prototype maintains a clean, minimal aesthetic.

- **No decorative elements** — no gradients, illustrations, or hero images on functional screens
- **Whitespace is intentional** — every element needs breathing room; crowding is a bug
- **Text hierarchy**: one dominant element per screen (the camera / image), one secondary (the chat), nothing else competing
- **Loading states are always shown** — any AI call > 500ms must show a visible indicator
- **Error messages are human** — "Something went wrong, please try again" not "Error 500: Internal Server Error"
- **No modal dialogs** — use inline states instead
- **Color palette**: maximum 2 accent colors per screen; the rest is neutral
- **Typography**: Geist font throughout; only 3 font sizes used (sm, base, lg)
- **Buttons**: one primary action per screen; secondary actions are text links

---

## 5. Prototype-Specific Rules

- **No feature creep** — if a feature isn't in the PRD scope, it does not get built
- **Fake it before you build it** — if a future feature appears in the UI, it shows a "Coming soon" state, it is never partially functional
- **Break things fast** — if something isn't working in 2 hours, escalate or pivot; don't silently spend days on it
- **Test with real students** — at least 3 students must test each mode before it's considered done
- **Document what breaks** — keep a running `KNOWN_ISSUES.md` during prototype phase; don't hide problems

---

## 6. Privacy (Prototype Minimum)

- Uploaded images are stored in Supabase Storage with a **1-hour TTL** and then deleted automatically.
- Images are never logged, printed, or stored in any other location.
- Message content is held in browser memory only (React state) — it is never persisted to the database in the prototype.
- A simple privacy notice must be displayed on the sign-up page.
