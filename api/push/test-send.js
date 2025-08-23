// /api/push/test-send.js
import webpush from "web-push";
import fs from "fs/promises"; // or your DB

// Vercel env vars
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

// IMPORTANT: subject must start with "mailto:" or "https://"
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// naive store used here; replace with your DB if you have one
async function loadSubs() {
  try {
    const txt = await fs.readFile("subs.json", "utf8");
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    // Prefer the subscription sent from the client, else load all saved
    const body = req.body || {};
    const oneSub = body?.sub;
    const subs = oneSub ? [oneSub] : await loadSubs();

    if (!subs.length) {
      return res.status(400).json({ ok: false, error: "No subscriptions found" });
    }

    // Use a known-good payload. Do NOT pass through arbitrary error strings.
    const title = body?.title || "Greenbank Masjid";
    const text  = body?.body  || "Test notification ✓";
    const url   = body?.url   || "https://greenbank-display.vercel.app/mobile";

    const payload = JSON.stringify({ title, body: text, url });

    const results = [];
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, payload, { TTL: 300 });
        results.push({ endpoint: sub.endpoint, ok: true });
      } catch (e) {
        // 410 Gone = stale subscription; you should remove it from storage
        results.push({ endpoint: sub.endpoint, ok: false, code: e.statusCode, message: e.body || e.message });
      }
    }

    return res.status(200).json({ ok: true, sent: results });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "Unknown server error" });
  }
}
