// api/push/schedule.js
import { put } from "@vercel/blob";

export const config = { runtime: "nodejs" };

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function readBody(req) {
  if (req.body) return req.body;
  const str = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  try { return JSON.parse(str || "{}"); } catch { return {}; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { entries, dateKey } = await readBody(req);
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, error: "No entries" });
    }
    const dk = dateKey || dayKey();
    const key = `push/schedule-${dk}.json`;

    await put(key, JSON.stringify({ dk, entries }), {
      access: "private",
      contentType: "application/json",
    });

    return res.json({ ok: true, dk, count: entries.length });
  } catch (e) {
    console.error("schedule error:", e);
    return res.status(500).json({ ok: false, error: "schedule save failed" });
  }
}
