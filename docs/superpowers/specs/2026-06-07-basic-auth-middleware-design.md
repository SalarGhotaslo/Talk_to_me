# Basic Auth Middleware — Design

**Date:** 2026-06-07  
**Status:** Approved

## Goal

Restrict access to the app so only people with the credentials can use it.  
Motivation: the app is connected to paid APIs and should not be accessible to strangers.

## Approach

Next.js Middleware (`middleware.ts`) intercepts every request and checks for a valid HTTP Basic Auth header. The browser's built-in login dialog handles the UX — no custom auth UI needed.

## Architecture

| File | Purpose |
|------|---------|
| `middleware.ts` | Edge middleware — validates `Authorization: Basic <base64>` on every request |
| `.env.local` | `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` (not committed) |
| `.env.example` | Documents the two new vars |

## Behaviour

- All routes are protected, including `/api/*`
- Only `/_next/static` and `/_next/image` are excluded (Next.js internals — no API calls happen there)
- Wrong or missing credentials → `401` + `WWW-Authenticate: Basic realm="Talk To Me"` → browser shows login dialog
- Correct credentials → request passes through unchanged
- Credentials are read from env vars at runtime, never hardcoded

## Security Notes

- Credentials are base64-encoded in transit — HTTPS (provided by any modern host) is required for real security
- All users share one username/password; revoking means changing both env vars and redeploying
- Suitable for "keep strangers out" use case; not suitable for per-user access control
