import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");

// Ensure the data store exists.
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(WAITLIST_FILE)) fs.writeFileSync(WAITLIST_FILE, "[]");
}

function readWaitlist() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(WAITLIST_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeWaitlist(entries) {
  ensureStore();
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(entries, null, 2));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Join the waitlist.
app.post("/api/waitlist", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const company = String(req.body?.company || "").trim().slice(0, 120);
  const useCase = String(req.body?.useCase || "").trim().slice(0, 500);

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  const entries = readWaitlist();
  if (entries.some((e) => e.email === email)) {
    return res.status(200).json({ ok: true, message: "You're already on the list — we'll be in touch!" });
  }

  entries.push({
    email,
    name,
    company,
    useCase,
    createdAt: new Date().toISOString(),
  });
  writeWaitlist(entries);

  return res.status(201).json({
    ok: true,
    message: "You're on the list! We'll reach out as spots open up.",
    position: entries.length,
  });
});

// Lightweight count for the social-proof counter.
app.get("/api/waitlist/count", (_req, res) => {
  res.json({ count: readWaitlist().length });
});

app.listen(PORT, () => {
  console.log(`Fluxon landing running at http://localhost:${PORT}`);
});
