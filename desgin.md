# ClarityAI Design Notes

This document records the practical product and UX design decisions behind the current prototype.

## Product Intent

ClarityAI is designed as a focused study companion, not a general chatbot. The product should feel like a guided tutor with two entry points:

- `Live OCR + Voice` for notebook-first tutoring
- `Send Image` for question-photo solving

The interaction model is intentionally simple:

- one clear next action on each screen
- minimal navigation
- fast feedback after capture or submission
- visible error states when browser capabilities or provider limits fail

## Primary User Journeys

### Journey 1: Live OCR + Voice

1. User lands on `/`.
2. User chooses `Live OCR + Voice`.
3. User selects an exam on `/exam-select`.
4. `/live-ocr` opens the camera and conversation workspace.
5. User can:
   - speak naturally
   - type a question
   - scan the page for deeper OCR context
6. Tutor replies in text and optional voice.

Design intent:

- keep the notebook or worksheet central
- keep context visible while chatting
- make the tutor feel immediate, not modal-heavy

### Journey 2: Send Image

1. User chooses `Send Image`.
2. User uploads a photo of a problem.
3. App shows a preview and a single primary `Analyze` action.
4. Initial solution streams into the thread.
5. Follow-up questions continue in the same workspace.

Design intent:

- make the first solve feel like a one-shot action
- avoid clutter before the image is selected
- shift into conversational mode only after the first answer is ready

## Screen-Level Design Decisions

### Home

- Two large cards only
- Each card describes one core outcome
- No dense dashboard or metrics

Why:

- this app has two primary jobs
- extra navigation would slow users down

### Exam Select

- Five cards for `CAT`, `GMAT`, `NEET`, `UPSC`, and `JEE`
- Each card shows a lightweight subject hint
- Selection immediately routes into the live tutor

Why:

- exam context changes prompt behavior enough to justify an explicit step
- the selection cost is low and improves downstream answers

### Live OCR + Voice

Layout:

- left side: live camera and scan context
- right side: conversation and controls
- camera overlay shows state, scan actions, and exam identity

Core controls:

- mic button
- scan page button
- text area for typed turns
- interrupt behavior when the model is speaking

Why:

- the student needs to keep the page in view while asking
- scan memory should feel additive, not like a separate workflow
- voice and text should be interchangeable

### Send Image

Layout:

- upload-first empty state
- image preview and controls after selection
- streamed answer below the preview
- conversation panel appears after initial analysis

Why:

- the first task is always image selection
- the follow-up chat only matters after a solution exists

## Interaction Rules

### Live tutor behavior

- guide, do not hand over direct final answers
- keep responses short enough for spoken delivery
- use exam-specific tone and depth
- carry only limited recent context to control cost and latency

### Send image behavior

- provide full worked solutions
- preserve readability during streaming
- allow conversational follow-up after the first solution

## Error and Capability Design

The UI should not fail silently.

Important surfaced states:

- camera permission denied
- no camera detected
- microphone unsupported
- OCR temporarily busy
- Gemini quota exhausted
- Gemini configuration invalid
- network interruption during streaming

Design rule:

- each failure should tell the user whether they can retry now, wait, or fix setup

## Voice Experience Decisions

- voice is integrated into the live tutor, not treated as a separate primary product
- transcript feedback is shown so users can confirm what was heard
- TTS is progressive so the reply begins before the full answer is complete
- interrupt must be immediate and cancel both speech and in-flight fetches

Why:

- spoken tutoring feels slow if playback waits for the full completion
- interruption is essential for a tutoring flow

## OCR Design Decisions

- deep scan is user-triggered, not constant full-page OCR
- scan memory is short-lived and session scoped
- repeated scans of the same page should be deduplicated where possible

Why:

- reduces unnecessary Gemini calls
- keeps the UI predictable
- avoids noisy OCR churn

## Visual Design Direction

- simple academic workspace, not marketing-heavy
- black camera surface with status overlays in live mode
- restrained borders and utility-driven layout
- motion used for transitions and state confirmation, not decoration

## Prototype Constraints

- chat history is not persisted to a database
- rate limiting is in-memory
- some behavior depends on browser speech APIs
- Gemini availability depends on current key quota and model access

## Documentation Alignment

These notes align with the current codebase where:

- `/live-ocr` is the primary tutor experience
- `/voice-agent` is only a redirect route
- Gemini fallback models were updated to currently supported options
- provider errors are classified more clearly than in earlier revisions
