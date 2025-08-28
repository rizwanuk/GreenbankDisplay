// api/push/schedule.js
import { put, get } from "@vercel/blob";

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function writeJson(key, data) {
  await put(key, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { entries, dateKey } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ ok: false, error: "No entries" });
    }
    const dk = dateKey || dayKey();
    const key = `push/schedule-${dk}.json`;

    await writeJson(key, { dk, entries });
    res.json({ ok: true, dk, count: entries.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "schedule save failed" });
  }
}
