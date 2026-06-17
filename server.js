import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { processSignup, getCount, isWebhookConfigured } from "./lib/sheets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Join the waitlist.
app.post("/api/waitlist", async (req, res) => {
  const { status, body } = await processSignup(req.body || {});
  res.status(status).json(body);
});

// Lightweight count for the social-proof counter.
app.get("/api/waitlist/count", async (_req, res) => {
  res.json({ count: await getCount() });
});

app.listen(PORT, () => {
  const target = isWebhookConfigured() ? "Google Sheet" : "local data/waitlist.json (dev fallback)";
  console.log(`Fluxon landing running at http://localhost:${PORT}`);
  console.log(`Waitlist signups -> ${target}`);
});
