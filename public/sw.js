// /api/push/test-send.js
import webpush from "web-push";

const PUB  = process.env.VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJ = process.env.VAPID_SUBJECT?.startsWith("mailto:")
  || process.env.VAPID_SUBJECT?.startsWith("https://")
  ? process.env.VAPID_SUBJECT
  : "mailto:admin@example.com";

webpush.setVapidDetails(SUBJ, PUB, PRIV);

export default async function handler(req, res) {
  try {
    const { sub, title, body, url } = req.body || {};
    if (!sub) return res.status(400).json({ ok: false, error: "Missing subscription" });
    if (!PUB || !PRIV) return res.status(500).json({ ok: false, error: "VAPID keys not set" });

    const payload = JSON.stringify({
      title: typeof title === "string" && title.trim() ? title : "Greenbank Masjid",
      body:  typeof body  === "string" && body.trim()  ? body  : "Test notification ✓",
      url:   typeof url   === "string" && url.trim()   ? url   : "https://greenbank-display.vercel.app/mobile"
    });

    await webpush.sendNotification(sub, payload, { TTL: 300 });
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Don't forward raw errors to the client or to the push payload
    return res.status(500).json({ ok: false, error: e?.message || "Send failed" });
  }
}
