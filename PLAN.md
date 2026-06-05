# Project Plan: Talk To Me

> **Status:** In Progress
> **Last Updated:** 2026-06-05
> **Owner:** @salar-ghotaslo

---

## Overview

A voice-first AI language tutor. The user clicks to speak in a chosen language; the AI responds conversationally, corrects mistakes naturally, and speaks back. Supports English, Swedish, Farsi, and Spanish.

---

## Goals

- [ ] Conversational AI bot that listens via voice and responds with voice
- [ ] Multi-language support: English, Swedish, Farsi, Spanish
- [ ] Natural language correction — AI models correct usage inline, not just flags errors
- [ ] Language learning assistance — encourages, asks follow-up questions, adapts to user level

## Non-Goals

- Mobile app (web only for now)
- Offline mode
- Grammar quizzes or structured lessons (conversation-only for MVP)
- Real-time streaming audio (turn-based: speak → response)

---

## Architecture

```
Browser (Next.js React app)
  ├── LanguageSelector   — user picks EN / SV / FA / ES
  ├── VoiceRecorder      — click to start, click to stop (Web Speech API STT)
  ├── ConversationView   — message history with correction highlights
  └── AudioPlayer        — speaks AI response (Web Speech API TTS)
        │
        ▼ POST /api/chat (server-side — OpenRouter key never exposed to browser)
  Next.js API Route
        │
        ▼
  OpenRouter → Claude 3.5 Sonnet / GPT-4o
```

**M2+:** SQLite (Drizzle ORM) + Auth.js → user accounts + conversation history
**M4+:** OpenAI Whisper (STT) + OpenAI TTS → premium voice quality

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript strict |
| Styling | Tailwind CSS |
| Unit/Integration tests | Vitest |
| E2E + a11y | Playwright + axe-playwright |
| Linter/Formatter | Biome |
| AI Provider | OpenRouter (Claude 3.5 Sonnet) |
| STT (M1) | Web Speech API — browser built-in |
| TTS (M1) | Web Speech API (speechSynthesis) — browser built-in |
| STT (M4) | OpenAI Whisper |
| TTS (M4) | OpenAI TTS |
| Database (M2) | SQLite via Drizzle ORM |
| Auth (M2) | Auth.js (magic link) |

---

## Milestones

### Milestone 1: Core Voice Conversation
**Target:** 2026-06-19 · **Status:** Not started

- [ ] Scaffold Next.js with TypeScript, Tailwind, App Router, src/ dir
- [ ] Reconfigure Biome, Vitest (jsdom), Playwright for Next.js
- [ ] Update package.json scripts and Lefthook hooks
- [ ] Define shared types (`Language`, `Message`, `ConversationState`)
- [ ] `buildSystemPrompt(language)` — unit tested
- [ ] OpenRouter client with streaming + error handling — unit tested
- [ ] `POST /api/chat` route with Zod validation + SSE streaming — integration tested
- [ ] Speech wrappers (`startListening`, `speak`, `isSTTSupported`, `isTTSSupported`) — unit tested
- [ ] `LanguageSelector` component — a11y tested
- [ ] `VoiceRecorder` component — idle / recording / processing states, keyboard accessible
- [ ] `ConversationView` component — auto-scroll, correction highlight
- [ ] `AudioPlayer` component — triggers TTS on new AI message
- [ ] Main page wiring all components with full conversation flow
- [ ] Unsupported browser fallback
- [ ] `GET /api/health` endpoint
- [ ] E2E: full happy-path conversation test
- [ ] E2E: axe scan — zero WCAG 2.1 AA violations
- [ ] `npm run check` green · `npm run test:all` green

### Milestone 2: User Accounts + Conversation History
**Target:** 2026-07-03 · **Status:** Not started

- [ ] SQLite schema: `users`, `conversations`, `messages` tables (Drizzle ORM)
- [ ] Auth.js setup — email magic link
- [ ] Middleware: attach `userId` to requests when session exists
- [ ] `/api/chat` saves messages to DB when authenticated
- [ ] History page — paginated past conversations
- [ ] Guest mode — full functionality without login, history not saved
- [ ] Integration tests for all DB operations (in-memory SQLite)
- [ ] E2E: login → conversation → logout → login → see history

### Milestone 3: Language Correction Features
**Target:** 2026-07-17 · **Status:** Not started

- [ ] Structured AI output: system prompt returns `{ reply, correction?, explanation? }`
- [ ] API route parses and validates structured response
- [ ] Correction card in `ConversationView` (original → corrected, brief explanation)
- [ ] End-of-session correction summary modal
- [ ] Unit tests for JSON parsing + correction card rendering
- [ ] E2E: deliberate grammar mistake → correction card visible

### Milestone 4: Premium Voice
**Target:** 2026-07-31 · **Status:** Not started

- [ ] `VoiceRecorder` captures raw audio blob via `MediaRecorder` API
- [ ] `POST /api/transcribe` → OpenAI Whisper
- [ ] `POST /api/speak` → OpenAI TTS (streamed audio)
- [ ] `AudioPlayer` plays streamed audio via Web Audio API
- [ ] Feature flag: `USE_OPENAI_AUDIO=true` switches from browser APIs
- [ ] `.env.example` updated with `OPENAI_API_KEY`

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Web Speech API not supported in Safari/Firefox | High | High | Detect at load time; show clear "use Chrome" message |
| Farsi TTS limited in browser voices | High | Medium | Note limitation in M1; fixed properly in M4 with OpenAI TTS |
| OpenRouter rate limits | Low | Medium | Show friendly retry UI; cache last response |
| STT mistranscription in Farsi/Swedish | Medium | Medium | M4 upgrade to Whisper resolves this |
| Auth.js complexity in M2 | Low | Medium | Use magic link only — no passwords, no OAuth for M2 |

---

## Open Questions

*None — all resolved.*

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-05 | Next.js 14 (App Router) as framework | Full-stack in one project; API routes keep OpenRouter key server-side; streaming support built-in |
| 2026-06-05 | Web Speech API for M1 STT + TTS | Free, zero setup, ships M1 fast; Whisper + OpenAI TTS added in M4 when quality matters |
| 2026-06-05 | Stateless M1, DB + auth in M2 | Keeps M1 focused on core voice UX; no refactoring needed — API designed to accept optional userId from start |
| 2026-06-05 | Auth.js magic link (no passwords) | Simplest secure auth; no password storage risk |
| 2026-06-05 | Click-to-toggle recording (not push-to-talk, not always-on) | Works on all devices; no accidental triggers; accessible via keyboard |
| 2026-06-05 | Use `meta-llama/llama-3.3-70b-instruct:free` via OpenRouter | Best free model for multilingual tasks (EN/SV/FA/ES); strong instruction following; no cost |
| 2026-06-05 | Language can be switched mid-conversation | Resets the speech recognition locale immediately; AI system prompt updated on next turn; conversation history preserved |
