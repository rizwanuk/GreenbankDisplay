// api/push/test-send.js
export const config = { runtime: "nodejs" };

import webpush from "web-push";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function readBlobJson(key, def = null) {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key }, TOKEN ? { token: TOKEN } : undefined);
    const b = blobs?.find(x => x.pathname === key) || blobs?.[0];
    const url = b?.url || b?.downloadUrl;
    if (!url) return def;
    const txt = await (await fetch(url)).text();
    return txt ? JSON.parse(txt) : def;
  } catch { return def; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });
  if (!TOKEN) return res.status(500).json({ ok:false, error:"server_missing_blob_token" });

  try {
    let subs = (await readBlobJson("push/subscriptions.json", [])) || [];
    if (!Array.isArray(subs)) subs = [];

    const payload = JSON.stringify({ title: "Greenbank Masjid", body: "Test notification", tag: "test" });

    const results = [];
    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(s, payload, { TTL: 300 });
        sent++;
        results.push({ endpoint: s.endpoint, ok: true });
      } catch (e) {
        results.push({ endpoint: s.endpoint, ok: false, code: e?.statusCode, message: e?.body || e?.message });
      }
    }
    res.json({ ok: true, sent, total: subs.length, results });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || "test_send_failed" });
  }
}
