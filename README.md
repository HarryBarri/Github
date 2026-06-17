# Fluxon — AI Automation Landing Page

> **Put your busywork on autopilot.**

Fluxon is an AI automation business. This repo contains its marketing landing
page and a working early-access **waitlist** that writes signups to a Google
Sheet, deployable to Vercel on a public URL.

## Going live

See **[SETUP.md](SETUP.md)** for the 10-minute walkthrough:
1. Connect the waitlist to a Google Sheet (via an Apps Script web app).
2. Deploy to Vercel and set the `SHEETS_WEBHOOK_URL` env var.

## What's here

| File | Purpose |
| --- | --- |
| `public/index.html` | The landing page (hero, how-it-works, use cases, FAQ, waitlist) |
| `public/styles.css` | Styling — dark, modern, responsive |
| `public/script.js` | Waitlist form handling + live signup counter |
| `api/waitlist.js` | Vercel function: `POST /api/waitlist` |
| `api/waitlist/count.js` | Vercel function: `GET /api/waitlist/count` |
| `lib/sheets.js` | Shared waitlist logic (validation, dedupe, Sheets webhook) |
| `server.js` | Express server for local dev (mirrors the functions) |
| `google-apps-script/Code.gs` | Apps Script that writes rows into your sheet |
| `vercel.json` | Routing + build config for Vercel |

## Run it locally

```bash
npm install
npm start            # http://localhost:3000
```

Without `SHEETS_WEBHOOK_URL` set, local dev falls back to storing signups in
`data/waitlist.json` so you can develop offline. To exercise the real Sheets
flow locally, copy `.env.example` to `.env` and fill in the webhook URL.

## Waitlist API

- `POST /api/waitlist` — body: `{ email, name?, company?, useCase? }`. Validates
  and de-duplicates the email, then appends a row to your Google Sheet.
- `GET /api/waitlist/count` — returns `{ count }` for the social-proof counter.

## Architecture

```
Browser form ─POST /api/waitlist─▶ Vercel function ─▶ Apps Script ─▶ Google Sheet
```

All persistence flows through `lib/sheets.js`, so you can later repoint the form
at Airtable, Resend/Loops, Mailchimp, or a database by editing only that file —
the front end and API contract stay the same.

## Why "Fluxon"?

Short, brandable, and evokes **flow** + automation — work moving smoothly and
automatically through your business.
