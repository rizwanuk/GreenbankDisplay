// api/push/schedule.js
export const config = { runtime: "nodejs" };

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function readBodyJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(buf || "{}"); } catch { return {}; }
}

async function writeBlobJson(key, data) {
  const { put } = await import("@vercel/blob");
  return put(key, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  try {
    const body = await readBodyJson(req);
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    const dk = body?.dateKey || dayKey();

    await writeBlobJson(`push/schedule-${dk}.json`, { dk, entries });
    return res.json({ ok: true, dk, count: entries.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "schedule_failed" });
  }
}
