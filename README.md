# Talk To Me — AI Language Tutor

A voice-first AI language tutor. Speak or type in your target language, get conversational AI responses with natural corrections, and hear them spoken back via premium TTS.

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (strict) |
| **UI** | React 18, Tailwind CSS v4 |
| **AI** | OpenAI Chat Completions, TTS, Realtime API |
| **STT** | Web Speech API (browser-native) |
| **Validation** | Zod |
| **Quality** | Biome (lint/format), Vitest, Playwright, axe-core WCAG audits |

## Features

- **Voice-first chat** — speak in your target language, get spoken responses
- **7 languages** — English, Spanish, French, Turkish, Dutch, Swedish, Farsi
- **Dual TTS** — OpenAI high-quality voice (per-language tuned) with browser speech synthesis fallback
- **Conversation modes** — Free, Restaurant, Travel, Shopping, Business, Introductions, Hobbies
- **Adaptive tutor** — AI adjusts to your proficiency level, corrects naturally, asks follow-ups
- **Realtime voice** — WebSocket-based low-latency voice conversations (OpenAI Realtime API)
- **Dark mode** — system-preference detection with manual toggle
- **Accessible** — WCAG 2.1 AA zero-tolerance, keyboard navigation, screen-reader support
- **Secure** — HTTP Basic Auth, no client-side API keys, secret scanning in CI

## Getting Started

### Prerequisites

- Node.js 20.19
- npm
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

```bash
git clone <repo-url>
cd talk-to-me
nvm use           # or: node --version should be 20.19
npm install
cp .env.example .env
```

Edit `.env` and add your credentials:

| Variable | Required | Default | Description |
|---|---|---|---|
| `BASIC_AUTH_USER` | Yes | — | Username for HTTP Basic Auth |
| `BASIC_AUTH_PASSWORD` | Yes | — | Password for HTTP Basic Auth |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key (chat, TTS, Realtime) |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Chat model to use |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL (Playwright, OpenRouter) |

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — Basic Auth will prompt for credentials.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Unit + integration tests |
| `npm run test:coverage` | Tests with coverage (≥85% required) |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:all` | Full test pyramid |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Biome lint |
| `npm run check` | All quality gates (typecheck + lint + coverage + build) |

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main conversation UI
│   ├── layout.tsx            # Root layout + dark mode
│   ├── middleware.ts         # HTTP Basic Auth
│   └── api/
│       ├── chat/route.ts     # POST — streaming chat responses
│       ├── speak/route.ts    # POST — TTS audio generation
│       └── realtime/token/   # POST — WebSocket session tokens
├── components/
│   ├── ConversationView.tsx   # Message list, corrections, auto-scroll
│   ├── VoiceRecorder.tsx      # Mic with 3-state UI
│   ├── AudioPlayer.tsx        # Triggers TTS on new messages
│   ├── TalkingFace.tsx        # Animated SVG tutor avatar
│   └── LanguageSelector.tsx   # Language picker
├── hooks/
│   └── useRealtimeConversation.ts
├── lib/
│   ├── openai.ts              # OpenAI streaming client
│   ├── openrouter.ts          # OpenRouter client (legacy)
│   ├── realtime.ts            # WebSocket voice session
│   ├── speech.ts              # STT, TTS, audio utilities
│   └── prompts.ts             # System prompt builder
└── types/
    ├── index.ts               # Shared types
    └── speech.d.ts            # Web Speech API declarations
```

## Testing

| Layer | Tool | What |
|---|---|---|
| **Unit** | Vitest + Testing Library | Pure functions, components in isolation |
| **Integration** | Vitest + jsdom | Full request→response with mocked API |
| **E2E** | Playwright + axe-core | User journeys + WCAG 2.1 AA audit |

```bash
npm run test:all     # full pyramid
npm run check        # all quality gates
```
