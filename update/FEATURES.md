# Feature Breakdown & Prioritization

> **Color coding**
> - 🟢 **Prototype** — Build this now
> - 🟡 **Launch** — Before public release
> - 🔴 **Later** — Post-launch roadmap

---

## 1. Vision Module — The "Eyes"

- 🟢 Snapshot every few seconds (configurable timer — e.g., 10 sec)
- 🟢 Snapshot on voice command ("take a photo", "look at this")
- 🟢 User can choose: auto-timer mode vs. voice-command-only mode
- 🟡 Mini blinker light on lamp when picture is taken *(privacy compliance)*
- 🟡 Shadow removal + tilt/perspective correction so paper looks flat
- 🔴 Auto-crop to only the incremental changed region of the page *(only if zero API cost, else not worth it)*
- 🟢 Gemini `gemini-2.0-flash` natively reads complex STEM diagrams, physics free-body diagrams, messy math scribbles — no separate OCR API needed

---

## 2. Voice Module — The "Ears & Mouth"

### Prototype (Browser Native)

- 🟢 **STT:** `Web Speech API` — press mic button, speak, get transcript
- 🟢 **TTS:** `SpeechSynthesis API` — AI response read aloud automatically
- 🟢 **Interrupt:** Stop button halts TTS + cancels Gemini fetch instantly
- 🟢 **Conversation memory:** Full `messages[]` history passed every turn

### Launch (WASM Edge)

- 🟡 **Wake-word:** Always-on "Hey Tutor" detection via Vosk WASM (no button press needed)
- 🟡 **STT upgrade:** `@xenova/transformers` + `whisper-base` — full Hinglish support
- 🟡 **TTS upgrade:** Piper TTS WASM — warm, human-like "elder sibling" voice
- 🟡 **Interrupt upgrade:** AbortController tied to Vosk voice trigger — fires on speech detection, not button press

### Language Support

- 🟢 English (Web Speech API covers this)
- 🟡 Hinglish — Hindi + English code-mixing (Whisper multilingual WASM)
- 🔴 Regional languages (Tamil, Telugu, Marathi, Bengali)

---

## 3. Pedagogical Brain — The "Tutor"

- 🟢 **Socratic Hinting:** Never gives the direct answer. Always asks a guiding question first.
  - *"Did you miss the 'square' in that formula?"*
  - *"What does the denominator represent in this fraction?"*
- 🟢 **Multi-turn conversation:** Student and AI go back and forth. Context retained across full session.
- 🟢 **Mistake Categorizer:** Silently identifies mistake type before responding:
  - **Conceptual** — Didn't know the theory
  - **Procedural** — Knew theory but messed up the steps
  - **Calculation** — Simple arithmetic error ("silly mistake")
  - **Reading** — Misread question, wrong units
- 🟡 **Smart Delay:** Based on problem difficulty + student effort, system waits before offering hints (pushes student to think first)
- 🟡 **Concept Explainer:** If student asks for conceptual clarity, AI explains the concept — but first asks the student to attempt an explanation
- 🟡 **Redirect to app:** If visual explanation (graphs, diagrams) is needed, AI says *"Open the app for a visual on this"*
- 🔴 **Customized explanations:** Based on student's aptitude level + personal interests (e.g., cricket analogies for physics problems)

---

## 4. Analytics Engine — The "Coach"

- 🟡 **Syllabus Tracker:** Shows how much of JEE/NEET syllabus is covered and truly "internalized" (measured by speed + accuracy, not just attempted)
- 🔴 **Performance Prediction:** *"Based on today's speed, you are in the top 5% for this topic"*
- 🔴 **Percentile Ranking:** Global data from all lamp users — *"You are currently in the 94th percentile for Organic Chemistry"*
- 🔴 **Efficacy Score:** Proprietary metric — accuracy + speed improvement over a 30-day rolling window
- 🔴 **Study Recommendations:** Identifies weak areas by mistake type, creates a custom study plan, provides personalized question bank
- 🔴 **Revision Scheduler:** Flags topics the student is starting to forget. Triggers "5-minute recap" sessions (spaced repetition)
- 🔴 **Flow Tracker:** Measures uninterrupted deep-work session lengths. Correlates with high-accuracy periods. Gamification: streaks, session counts
- 🔴 **Burnout Detection:** Voice-based stress markers + timing/speed data → suggests recovery periods
- 🔴 **Parental Dashboard:** Daily summary: *"Rohan studied 4 hours; excelled in Algebra but needs help in Geometry"*

---

## 5. Content Integration

- 🟡 **Coaching material RAG:** Pre-load standard JEE/NEET questions into pgvector. System checks this database first — cached Socratic hints returned at ~$0 instead of calling Gemini
- 🟡 **Voice-triggered question lookup:** Student says chapter + question number → system fetches that question image directly
- 🔴 **Mock test mode:** No voice/discussion during test. Auto-capture every 5 seconds. Auto-infer missing edge steps when student turns a page
- 🔴 **Coaching institute integration:** Pre-feed material from specific institutes (Allen, Aakash, Unacademy, etc.)
- 🔴 **Fine-tuned proprietary model:** Train a custom model on JEE/NEET data to reduce Gemini dependency entirely *(long-term)*

---

## 6. Hardware — The Lamp

> Prototype uses laptop webcam. Build lamp hardware only after prototype is validated.

### 🟡 Launch Hardware (BOM: ₹1,500–₹2,000)

| Component | Cost (INR) | Spec |
|---|---|---|
| ESP32-S3 WROOM Module | ₹350–₹450 | Bulk sourcing, not DevKit |
| Camera Module | ₹300–₹350 | 5MP OV5640, custom ribbon cable |
| Lamp Body & Flexible Neck | ₹450–₹550 | Plastic base + LED head |
| LED PCB (High CRI) | ₹100–₹150 | For paper clarity and correct color rendering |
| Battery + BMS | ₹180–₹220 | 2500–3000mAh 18650 cell + protection |
| Audio — MEMS Mic + 2W Speaker | ₹120–₹160 | For hardware voice (Vosk wake-word) |
| Main PCB + SMT Assembly | ₹150–₹200 | All components on one board |
| **Total Factory Price** | **~₹1,650–₹2,080** | |

### Hardware Connection to App

- ESP32 connects to student's local Wi-Fi
- Streams video frames + raw audio over **WebRTC or WebSocket** to Next.js frontend
- Student's phone/laptop does all the AI processing — ESP32 is purely a "dumb terminal"
