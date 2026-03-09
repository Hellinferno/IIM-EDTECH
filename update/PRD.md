# Product Requirements Document (PRD): 24x7 AI Tutor

> **Scope Legend**
> - 🟢 **Prototype** — Build this now
> - 🟡 **Launch** — Build before public release
> - 🔴 **Later** — Post-launch roadmap

---

## 1. Product Overview

The **24x7 AI Tutor** is a hybrid hardware-software educational tool designed for competitive exam aspirants (JEE, NEET, UPSC, college level). It consists of a low-cost hardware desk lamp (BOM ₹1,500–₹2,000) that captures images and audio, while the student's phone/laptop acts as the processing hub.

The core value proposition is **Socratic Tutoring** — the AI never spoon-feeds answers. It acts as an "elder sibling," observing the student's work and providing contextual, voice-based hints to help them overcome conceptual or calculation roadblocks.

---

## 2. Target Audience

- **Primary:** JEE, NEET, UPSC, SSC, and college students
- **Needs:** High accuracy on complex STEM and logical questions, natural conversational interaction, and strict adherence to Socratic teaching methods (no direct answers)

---

## 3. The Four Software Pillars

### A. Vision Module — The "Eyes"

| Feature | Scope |
|---|---|
| Snapshot every N seconds (configurable) | 🟢 Prototype |
| Voice-triggered snapshot ("take a photo") | 🟢 Prototype |
| Mini blinker light on lamp for privacy | 🟡 Launch |
| Shadow removal & tilt/perspective correction | 🟡 Launch |
| Auto-crop for incremental page regions only | 🔴 Later |
| Gemini `gemini-2.0-flash` multimodal OCR for diagrams, scribbles, equations | 🟢 Prototype |

---

### B. Voice Module — The "Ears & Mouth"

| Feature | Prototype Implementation | Launch Implementation |
|---|---|---|
| Speech-to-Text (STT) | `Web Speech API` — browser native, zero setup | `@xenova/transformers` + `whisper-base` WASM — full Hinglish support |
| Text-to-Speech (TTS) | `SpeechSynthesis API` — browser native | Piper TTS WASM — warm, low-latency, natural voice |
| Wake-word | Mic button in UI | Vosk WASM — always-on "Hey Tutor" detection |
| Interrupt / Stop | Stop button cancels fetch + stops TTS | AbortController fired synchronously by Vosk voice trigger |
| Hinglish support | Partial (depends on browser) | Full (Whisper multilingual model) |

---

### C. Pedagogical Brain — The "Tutor"

| Feature | Scope |
|---|---|
| Socratic hinting — never gives direct answers | 🟢 Prototype |
| Multi-turn conversational memory (`messages[]` array) | 🟢 Prototype |
| Mistake categorizer: Conceptual / Procedural / Calculation / Reading | 🟢 Prototype |
| Smart delay before offering hints (based on difficulty) | 🟡 Launch |
| Concept explainer — asks student to think first, then explains | 🟡 Launch |
| Customized explanations based on student aptitude + interests (e.g., cricket analogies) | 🔴 Later |

---

### D. Analytics Engine — The "Coach"

| Feature | Scope |
|---|---|
| Syllabus & performance tracker (JEE/NEET topic map) | 🟡 Launch |
| Performance percentile prediction (global user data) | 🔴 Later |
| Efficacy score — 30-day rolling accuracy + speed metric | 🔴 Later |
| Revision scheduler (spaced repetition for forgotten topics) | 🔴 Later |
| Deep-work flow tracker + burnout detection via voice analytics | 🔴 Later |
| Parental dashboard — daily SMS/email summary | 🔴 Later |

---

## 4. Conversational Feature — Prototype Core

The conversational loop is the heart of the prototype. Every turn must feel like talking to a knowledgeable elder sibling, not a Q&A bot.

**Prototype Conversational Flow:**
```
Student presses [Mic] button
→ Web Speech API captures voice → transcribed to text instantly
→ Text + current snapshot image (if in Live OCR mode) + full messages[] history
  sent to POST /api/chat
→ Gemini gemini-2.0-flash streams Socratic response tokens
→ SpeechSynthesis reads response aloud sentence by sentence
→ Student presses [Mic] again to reply — or [Stop] to interrupt at any time
→ Conversation continues with full context retained in messages[] state
```

**Non-negotiable rule:** `/api/chat` must always receive the full `messages[]` array — never a single isolated prompt. Gemini must always have the entire session context.

---

## 5. Cost Optimization Strategy

| Layer | Strategy | Cost |
|---|---|---|
| Voice (Prototype) | Browser native Web Speech + SpeechSynthesis | $0 |
| Voice (Launch) | WASM runs entirely in browser | $0 |
| Known standard questions | RAG lookup in Supabase pgvector first | ~$0 |
| Novel/complex questions | Gemini `gemini-2.0-flash` API call | Pay-per-use |
| Image storage | Auto-delete from Supabase Storage after Gemini processes | Minimal |

---

## 6. Hardware Specification (BOM: ₹1,500–₹2,000)

> **Prototype uses laptop webcam. ESP32 lamp hardware is built only after prototype is validated by real students.**

| Component | Cost (INR) | Notes |
|---|---|---|
| ESP32-S3 WROOM Module | ₹350–₹450 | Bulk sourcing, not DevKit |
| Camera Module (OV5640 5MP) | ₹300–₹350 | Custom-length ribbon cable |
| Lamp Body & Flexible Neck | ₹450–₹550 | Plastic base + LED head |
| LED PCB & Driver (High CRI) | ₹100–₹150 | For paper clarity |
| Battery & BMS (18650 cell) | ₹180–₹220 | 2500–3000mAh + protection circuit |
| Audio — MEMS Mic + 2W Speaker | ₹120–₹160 | For launch voice hardware |
| Main PCB + SMT Assembly | ₹150–₹200 | One board for all components |
| **Total Factory Price** | **~₹1,650–₹2,080** | |
