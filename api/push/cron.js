// api/push/cron.js
export const config = { runtime: "nodejs" };

import webpush from "web-push";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function readBlobJson(key, def = null) {
  try {
    const { get } = await import("@vercel/blob");
    const r = await get(key, TOKEN ? { token: TOKEN } : undefined);
    const url = r?.downloadUrl || r?.url;
    if (!url) return def;
    const txt = await (await fetch(url)).text();
    return txt ? JSON.parse(txt) : def;
  } catch {
    return def;
  }
}

async function writeBlobJson(key, data) {
  const { put } = await import("@vercel/blob");
  return put(key, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    ...(TOKEN ? { token: TOKEN } : {}),
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (!TOKEN) return res.status(500).json({ ok: false, error: "server_missing_blob_token" });

  try {
    const dk = (new URL(req.url, `https://${req.headers.host}`)).searchParams.get("dk") || dayKey();

    const schedule = (await readBlobJson(`push/schedule-${dk}.json`, { entries: [] })) || { entries: [] };
    let subs = (await readBlobJson("push/subscriptions.json", [])) || [];
    if (!Array.isArray(subs)) subs = [];

    const now = Date.now();
    const due = (schedule.entries || []).filter(e => {
      const ts = typeof e.ts === "number" ? e.ts : Date.parse(e.ts || "");
      return Number.isFinite(ts) && ts <= now && now - ts < 10 * 60 * 1000;
    });

    const results = [];
    const toRemove = new Set();
    let sentCount = 0;

    for (const n of due) {
      const payload = JSON.stringify({
        title: n.title || "Greenbank Masjid",
        body: n.body || "",
        tag: n.tag || "announcement",
        data: n.data || {},
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub, payload, { TTL: 300 });
          sentCount++;
          results.push({ endpoint: sub.endpoint, ok: true });
        } catch (e) {
          if (e?.statusCode === 410 || e?.statusCode === 404) toRemove.add(sub.endpoint);
          results.push({ endpoint: sub.endpoint, ok: false, code: e?.statusCode, message: e?.body || e?.message });
        }
      }
    }

    if (toRemove.size > 0) {
      subs = subs.filter((s) => !toRemove.has(s.endpoint));
      await writeBlobJson("push/subscriptions.json", subs);
    }

    return res.json({ ok: true, dk, checked: due.length, sentCount, pruned: toRemove.size, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "cron_failed" });
  }
}
