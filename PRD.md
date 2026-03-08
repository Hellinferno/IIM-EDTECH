# Product Requirements Document (PRD)
## Project: ClarityAI — Prototype v0.1
**Stage:** Prototype  
**Last Updated:** March 2026

---

## 1. What We're Building

ClarityAI is an AI-powered learning companion that helps students understand concepts — not by giving away answers, but by guiding them like a smart friend. The prototype validates two core ideas:

1. Can real-time OCR + AI create a useful guided study experience?
2. Is a direct image-to-answer flow fast and clear enough to replace typing?

The prototype is a **web app** (mobile browser compatible). No native app yet.

---

## 2. Prototype Scope

### In Scope
- User authentication (sign up / sign in)
- Live OCR Mode (camera → OCR → guided AI chat)
- Send Image Mode (upload → AI direct answer)
- Conversational follow-up in both modes
- Basic session history (current session only)

### Explicitly Out of Scope
- Native iOS / Android app
- Voice input / output
- Offline mode
- Multi-language support
- Gamification, rewards, streaks
- Teacher / parent dashboards
- Push notifications
- Payment / subscription flows
- Long-term session history / user profiles

---

## 3. The Two Modes

### Mode 1 — Live OCR
The student opens their camera and points it at a question or notes. The app captures a frame every few seconds, extracts the text via Google Cloud Vision OCR, and passes it to Claude. The AI responds conversationally — asking guiding questions, identifying mistakes, explaining concepts. It **never gives the direct answer**.

**Key experience:** It feels like texting a smart tutor who can see what you're looking at.

### Mode 2 — Send Image
The student uploads a photo of a question (or takes one on mobile). The AI reads the image using Claude Vision and returns a **complete, step-by-step solution** immediately. The student can then ask follow-up questions in a chat thread below.

**Key experience:** Instant, clear answers with reasoning shown — not just the final result.

---

## 4. User Flow

### Onboarding
```
Landing page → Sign up / Sign in (Clerk) → Home (choose mode)
```

### Live OCR Flow
```
Home → "Live OCR"
→ Camera preview opens
→ Frame captured every 3 seconds
→ Google Vision OCR extracts text
→ Extracted text shown in a card above chat
→ Claude responds with guided question / hint
→ Student types reply → conversation continues
→ "End Session" → brief summary card shown
```

### Send Image Flow
```
Home → "Send Image"
→ Upload image or take photo (mobile camera)
→ Loading state (processing indicator)
→ Claude Vision returns full step-by-step answer
→ Answer displayed in clean chat format
→ Student types follow-up → conversation continues
```

---

## 5. UI Principles

The prototype UI must be:

- **Minimal** — no clutter, no sidebars, no feature bloat visible
- **Calm** — neutral palette (off-white / soft dark), generous whitespace
- **Focused** — camera or uploaded image is always the hero element; chat is secondary
- **Fast-feeling** — streaming AI responses, skeleton loaders, no dead waits
- **Mobile-first** — fully usable on a phone browser
- **No decorative icons or illustrations** — typography and space do the work

---

## 6. Prototype Success Criteria

| Criteria | Pass |
|---|---|
| OCR reads printed text accurately | ≥ 85% accuracy |
| OCR reads clean handwriting | ≥ 70% accuracy |
| AI never gives direct answer in OCR mode | 0 violations in 20 test sessions |
| AI gives complete answer in Image mode | ≥ 90% of uploads |
| First AI response under 4 seconds | Pass in 20 test sessions |
| 5 students complete a session unaided | ≥ 4 out of 5 succeed |

---

## 7. Research Questions This Prototype Answers

- Is real-time OCR accurate enough for real student handwriting and notes?
- Does the guided (no-answer) conversational mode feel helpful or frustrating?
- What is the biggest friction point in each mode?
- What subject areas cause the AI to break or hallucinate?
- Do students naturally continue the conversation or give up after 1–2 messages?
