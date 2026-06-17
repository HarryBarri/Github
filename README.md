# Fluxon — AI Automation Landing Page

> **Put your busywork on autopilot.**

Fluxon is an AI automation business. This repo contains its marketing landing
page and a working early-access **waitlist** that captures signups.

## What's here

| File | Purpose |
| --- | --- |
| `public/index.html` | The landing page (hero, how-it-works, use cases, FAQ, waitlist) |
| `public/styles.css` | Styling — dark, modern, responsive |
| `public/script.js` | Waitlist form handling + live signup counter |
| `server.js` | Express server + waitlist API (`/api/waitlist`) |
| `data/waitlist.json` | Where signups are stored (created automatically, git-ignored) |

## Run it locally

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Waitlist API

- `POST /api/waitlist` — body: `{ email, name?, company?, useCase? }`. Validates
  and de-duplicates the email, then appends the signup to `data/waitlist.json`.
- `GET /api/waitlist/count` — returns `{ count }` for the social-proof counter.

Signups are stored as JSON on disk so it works with zero external dependencies.
To make it production-grade, swap the `readWaitlist`/`writeWaitlist` helpers in
`server.js` for a database (Postgres, Supabase, Airtable) or an email tool
(Mailchimp, Loops, Resend) — the API contract stays the same.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS). Set the `PORT` env var if
your host requires it; it defaults to `3000`.

## Why "Fluxon"?

Short, brandable, and evokes **flow** + automation — work moving smoothly and
automatically through your business.
