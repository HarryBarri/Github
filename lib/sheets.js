import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const FALLBACK_FILE = path.join(DATA_DIR, "waitlist.json");

const WEBHOOK_URL = process.env.SHEETS_WEBHOOK_URL || "";
const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET || "";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isWebhookConfigured() {
  return Boolean(WEBHOOK_URL);
}

/**
 * Validate + persist a signup. Shared by the local Express server and the
 * Vercel serverless function so both behave identically.
 * Returns { status, body } ready to send as an HTTP response.
 */
export async function processSignup(input = {}) {
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "").trim().slice(0, 120);
  const company = String(input.company || "").trim().slice(0, 120);
  const useCase = String(input.useCase || "").trim().slice(0, 500);

  if (!EMAIL_RE.test(email)) {
    return { status: 400, body: { ok: false, error: "Please enter a valid email address." } };
  }

  try {
    const result = await submitSignup({ email, name, company, useCase });
    if (result.duplicate) {
      return { status: 200, body: { ok: true, message: "You're already on the list — we'll be in touch!" } };
    }
    return {
      status: 201,
      body: { ok: true, message: "You're on the list! We'll reach out as spots open up.", count: result.count },
    };
  } catch (err) {
    console.error("waitlist submit failed:", err);
    return {
      status: 502,
      body: { ok: false, error: "We couldn't save your signup right now. Please try again shortly." },
    };
  }
}

async function submitSignup(entry) {
  if (WEBHOOK_URL) return submitToSheet(entry);
  return submitLocal(entry);
}

export async function getCount() {
  if (WEBHOOK_URL) {
    try {
      const res = await fetch(WEBHOOK_URL, { method: "GET", redirect: "follow" });
      const data = await res.json();
      return Number(data.count) || 0;
    } catch {
      return 0;
    }
  }
  return readLocal().length;
}

// ---- Google Sheets (via Apps Script web app) ----
async function submitToSheet(entry) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({ ...entry, secret: WEBHOOK_SECRET }),
  });
  if (!res.ok) throw new Error(`Sheet webhook responded with ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data.ok === false) throw new Error(data.error || "Sheet webhook rejected the signup");
  return { duplicate: Boolean(data.duplicate), count: data.count };
}

// ---- Local JSON fallback (used only when SHEETS_WEBHOOK_URL is unset) ----
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FALLBACK_FILE)) fs.writeFileSync(FALLBACK_FILE, "[]");
}

function readLocal() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(FALLBACK_FILE, "utf8"));
  } catch {
    return [];
  }
}

function submitLocal(entry) {
  const entries = readLocal();
  if (entries.some((e) => e.email === entry.email)) {
    return { duplicate: true, count: entries.length };
  }
  entries.push({ ...entry, createdAt: new Date().toISOString() });
  ensureStore();
  fs.writeFileSync(FALLBACK_FILE, JSON.stringify(entries, null, 2));
  return { duplicate: false, count: entries.length };
}
