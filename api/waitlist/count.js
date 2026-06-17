import { getCount } from "../../lib/sheets.js";

// Vercel serverless function: GET /api/waitlist/count
export default async function handler(_req, res) {
  const count = await getCount();
  res.status(200).json({ count });
}
