# Fluxon — Go-Live Setup

This connects the waitlist to a **Google Sheet** on your account
(`harryakubu@gmail.com`) and deploys the site to **Vercel** on a public URL.

The code and config are already done. These steps need *your* Google and Vercel
logins, so you do them once (≈10 minutes total).

---

## Part 1 — Connect the waitlist to a Google Sheet

We use a Google Apps Script "web app" as the bridge. No Google Cloud project,
no API keys — signups land as rows in your sheet.

1. **Create the sheet.** Go to <https://sheets.new> while signed in as
   `harryakubu@gmail.com`. Name it e.g. **"Fluxon Waitlist"**.

2. **Open the script editor.** In the sheet: **Extensions → Apps Script**.

3. **Paste the script.** Delete the placeholder code, then paste the entire
   contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
   Click the **Save** icon.
   - *(Optional, recommended)* set a `SHARED_SECRET` value near the top of the
     script — any random string. Remember it for Part 2.

4. **Deploy as a web app.** Click **Deploy → New deployment**.
   - Click the gear ⚙ next to "Select type" → choose **Web app**.
   - **Execute as:** Me (`harryakubu@gmail.com`)
   - **Who has access:** **Anyone**
   - Click **Deploy**. Approve the permissions prompt (it's your own script
     writing to your own sheet).

5. **Copy the Web app URL.** It looks like
   `https://script.google.com/macros/s/AKfy…/exec`. Keep it for Part 2.

> Want to test it now? Paste the URL into a browser — it should return
> `{"ok":true,"count":0}`.

---

## Part 2 — Deploy to Vercel

The repo is already on GitHub at `HarryBarri/Github`
(branch `claude/ai-automation-landing-page-jbsii2`).

1. Go to <https://vercel.com/new> and sign in (GitHub login is easiest).
2. **Import** the `HarryBarri/Github` repository.
3. Framework preset: **Other** (the included `vercel.json` handles routing).
   Leave build/output settings empty.
4. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `SHEETS_WEBHOOK_URL` | the Web app URL from Part 1, step 5 |
   | `SHEETS_WEBHOOK_SECRET` | the secret from Part 1, step 3 *(only if you set one)* |

5. Click **Deploy**. In ~1 minute you'll get a live URL like
   `https://github-xxxx.vercel.app`.

> If you deploy from the `master` branch, Vercel gives you the production URL.
> To deploy this feature branch first, pick it as the production branch or open
> a preview deployment — then merge to `master` when you're happy.

---

## Verify it works

1. Open your live URL, scroll to **Join the waitlist**, and submit a test email.
2. Check your Google Sheet — a new row should appear with the timestamp, email,
   name, company, and use case.
3. Reload the page; the counter near the hero reflects the sheet's row count.

---

## How it's wired (for reference)

```
Browser form ──POST /api/waitlist──▶ Vercel function ──POST──▶ Apps Script ──▶ Google Sheet
                                          │
                          reads SHEETS_WEBHOOK_URL from env
```

- `api/waitlist.js` + `api/waitlist/count.js` — Vercel serverless functions.
- `lib/sheets.js` — shared logic (validation, dedupe, webhook call). If
  `SHEETS_WEBHOOK_URL` is unset, it falls back to a local JSON file so the site
  still runs in local dev.
- `google-apps-script/Code.gs` — the receiver that writes rows to your sheet
  (and de-duplicates emails).

## Swapping providers later

Because everything funnels through `lib/sheets.js`, you can later point the same
form at Airtable, Resend/Loops, Mailchimp, or a database by editing only that
file — the front end and API contract stay the same.
