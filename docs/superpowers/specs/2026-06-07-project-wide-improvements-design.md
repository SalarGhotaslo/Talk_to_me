# Project-Wide Improvements — Design

**Date:** 2026-06-07  
**Status:** Approved  
**Scope:** Fixes, refactoring, new features, full test pass

---

## What We Found (Current State)

### Broken
- All 8 E2E tests fail — Playwright sends no credentials, gets 401 from Basic Auth middleware
- No `<main>` landmark in page.tsx — a11y E2E test checks for it explicitly
- Textarea (typed input) has no accessible label — WCAG 2.1 AA violation

### Code Quality
- `page.tsx` is 408 lines and does too much: speech recognition reimplemented inline despite `startListening()` existing in `speech.ts`; `ConversationState` type duplicated locally despite existing in `src/types/index.ts`
- Errors from `sendMessage` are silently swallowed — user sees nothing on API failure

### Missing Features
- No AI "thinking" indicator while waiting for response (user sees nothing between send and first stream token)
- No way to interrupt TTS mid-playback (mic stays disabled while AI speaks)
- No way to clear/reset conversation without changing language
- Farsi messages not rendered RTL (Farsi is a right-to-left language)
- No keyboard shortcut for mic (Space bar when not focused on textarea)
- No copy-to-clipboard on AI messages (useful for learners)
- No error feedback (toast/banner when API fails)

---

## Design

### Wave 1 — Fix Broken Things

**E2E / Playwright:**  
Add `httpCredentials` to `playwright.config.ts` sourced from `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` env vars (same ones already in `.env`). Also add `OPENAI_API_KEY` to the `webServer.env` block so speak/chat routes don't 503 during E2E.

**`<main>` landmark:**  
Change the root `<div>` in `page.tsx` to `<main>`. This satisfies both the a11y test and WCAG landmark requirement.

**Textarea label:**  
Add `aria-label="Type a message"` to the textarea. Visible label not needed (placeholder is sufficient visually); aria-label satisfies WCAG.

---

### Wave 2 — Refactor page.tsx

Extract a `useConversation` hook (`src/hooks/useConversation.ts`) that owns:
- `messages`, `language`, `recordingState`, `topic`, `isSpeaking`, `typedText` state
- `sendMessage(text)` — fetch + SSE streaming + TTS
- `handleRecordingToggle()` — delegates to `startListening()` from `speech.ts` (removes ~70 lines of duplicated code)
- `handleTypedSend()`, `handleKeyDown()`
- `toggleDark()` and dark-mode persistence
- Topic dropdown state

`page.tsx` becomes ~80 lines of pure JSX wiring the hook to components.

Types: delete local `ConversationState` definition from `page.tsx`, import from `@/types`.

---

### Wave 3 — New Features

**AI thinking indicator:**  
When `recordingState === "processing"`, show a three-dot pulse animation bubble in `ConversationView` (same position as assistant messages) until the first stream token arrives. Remove it once streaming begins.

**Interrupt TTS with mic tap:**  
During `isSpeaking`, the mic button is currently disabled. Change: tapping mic while AI speaks cancels the current audio and immediately starts recording. Requires exposing a `cancelSpeech()` function from the audio playback.

**Clear conversation button:**  
Add a small "Clear" / trash icon button in the header that resets `messages` to `[]`. Only visible when messages.length > 0. Confirm with `aria-label="Clear conversation"`.

**RTL support for Farsi:**  
When `language === "fa"`, add `dir="rtl"` and `text-right` to message bubbles. User messages (normally right-aligned) become left-aligned in RTL. This is purely CSS/attribute — no logic change.

**Keyboard shortcut — Space for mic:**  
`useEffect` in `useConversation` that listens for `keydown` with `key === " "` when `document.activeElement` is `document.body` (i.e. nothing is focused). Calls `handleRecordingToggle()`. Does NOT fire when textarea or any input is focused.

**Copy AI message:**  
On hover of an assistant message bubble, show a small copy icon button. On click: `navigator.clipboard.writeText(content)` + brief "Copied!" tooltip. Fully keyboard accessible (`Tab` to focus, `Enter` to copy).

**Error toast:**  
A `toast` state (`string | null`) in `useConversation`. When `sendMessage` catches an error, set a human-readable message (e.g. "Couldn't reach the AI — please try again"). Display as a fixed bottom banner that auto-dismisses after 4 seconds. Dismiss also on click.

---

### Wave 4 — Tests & Verification

**Unit tests to add/update:**
- `useConversation.test.ts` — test sendMessage, recordingToggle, dark mode, error toast
- `ConversationView.test.tsx` — add test for thinking indicator, RTL rendering, copy button
- `middleware.test.ts` — verify existing tests cover our Basic Auth (check, add cases if not)

**E2E tests to update:**
- `playwright.config.ts` gets `httpCredentials` — all existing tests should pass
- `a11y.spec.ts` — add test for `<main>` landmark (already exists, should now pass)
- `conversation.spec.ts` — add test for clear button, error state

**Full run:** `npm run check` + `npm run test:e2e` — all must be green.

---

## Architecture Notes

- `useConversation` hook is the single source of truth for all conversation state
- `page.tsx` only renders — zero business logic
- No new dependencies needed (copy API is native, RTL is CSS)
- Dark mode toggle stays client-side with `localStorage` (no server state)
- Error toast is ephemeral state — not persisted

---

## Files Changed

| File | Action |
|------|--------|
| `playwright.config.ts` | Add httpCredentials + OPENAI_API_KEY to webServer env |
| `src/app/page.tsx` | Shrink to ~80 lines, use useConversation hook, add `<main>` |
| `src/hooks/useConversation.ts` | New — all conversation/recording/dark-mode logic |
| `src/components/ConversationView.tsx` | Add thinking indicator, RTL support, copy button |
| `src/components/ErrorToast.tsx` | New — auto-dismiss error banner |
| `src/app/layout.tsx` | Minor — ensure html lang stays correct |
| `tests/unit/useConversation.test.ts` | New |
| `tests/unit/ConversationView.test.tsx` | Update with new features |
| `tests/e2e/conversation.spec.ts` | Add clear + error tests |
