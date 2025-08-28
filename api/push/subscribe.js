// api/push/subscribe.js
import { put, get } from "@vercel/blob";

export const config = { runtime: "nodejs20.x" };

const SUBS_KEY = "push/subscriptions.json";

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

async function readSubs() {
  try {
    const res = await get(SUBS_KEY, { allowPrivate: true });
    const txt = await res.body?.text();
    return txt ? JSON.parse(txt) : [];
  } catch (e) {
    // 404/403/etc → treat as empty list
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
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = await readBody(req);
    const sub = body?.subscription || body;
    if (!sub?.endpoint) {
      return res.status(400).json({ ok: false, error: "Invalid subscription" });
    }

    const subs = await readSubs();
    const map = new Map(subs.map((s) => [s.endpoint, s]));
    map.set(sub.endpoint, sub); // upsert
    await writeSubs(Array.from(map.values()));

    return res.json({ ok: true, count: map.size });
  } catch (e) {
    console.error("subscribe error:", e);
    return res.status(500).json({ ok: false, error: "subscribe failed" });
  }
}
