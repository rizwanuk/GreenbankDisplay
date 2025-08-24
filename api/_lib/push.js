// api/_lib/push.js
const webpush = require("web-push");
const { remove } = require("./subscriptions");

const PUB = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
const SUBJ = process.env.VAPID_SUBJECT || "mailto:ops@example.com";

if (PUB && PRIV) {
  try { webpush.setVapidDetails(SUBJ, PUB, PRIV); }
  catch (e) { console.warn("[push] VAPID setup failed:", e?.message || e); }
} else {
  console.warn("[push] Missing VAPID keys; notifications will fail.");
}

async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 300 }
    );
    return true;
  } catch (e) {
    const code = e?.statusCode || e?.code;
    // 404/410 — subscription gone
    if (code === 404 || code === 410) {
      try { await remove(sub.endpoint); } catch {}
    }
    console.warn("[push] send error:", code, e?.message || e);
    return false;
  }
}

module.exports = { sendPush };
