import { processSignup } from "../lib/sheets.js";

// Vercel serverless function: POST /api/waitlist
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const { status, body: payload } = await processSignup(body);
  return res.status(status).json(payload);
}

function safeParse(str) {
  try {
    return JSON.parse(str || "{}");
  } catch {
    return {};
  }
}
