// api/push/subscribe.js
import { put, get } from "@vercel/blob";

const SUBS_KEY = "push/subscriptions.json";

async function readSubs() {
  try {
    const res = await get(SUBS_KEY, { allowPrivate: true });
    const text = await res.body?.text();
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}
async function writeSubs(list) {
  await put(SUBS_KEY, JSON.stringify(list), {
    access: "private",
    contentType: "application/json",
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const sub = req.body?.subscription || req.body; // allow raw subscription
    if (!sub?.endpoint) return res.status(400).json({ ok: false, error: "Invalid subscription" });

    const subs = await readSubs();
    const map = new Map(subs.map((s) => [s.endpoint, s]));
    map.set(sub.endpoint, sub); // upsert
    await writeSubs(Array.from(map.values()));

    res.json({ ok: true, count: map.size });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || "subscribe failed" });
  }
}
