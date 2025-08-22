// api/push/test-send.js
const webpush = require("web-push");
const { readAll, remove } = require("../_lib/subscriptions");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn("[push] Missing VAPID keys in env");
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const payload = {
      title: body.title || "Greenbank Masjid",
      body: body.body || "Test notification from /api/push/test-send",
      url: body.url || "/mobile/",
    };

    let targets = [];
    if (body.sub && body.sub.endpoint) {
      targets = [body.sub];
    } else {
      targets = await readAll();
    }

    if (!targets.length) {
      return res.status(200).json({ ok: true, sent: 0, note: "No subscriptions found" });
    }

    const results = await Promise.allSettled(
      targets.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload));
          return { endpoint: sub.endpoint, ok: true };
        } catch (err) {
          // 404/410 => remove stale sub
          const code = err?.statusCode || err?.code;
          if (code === 404 || code === 410) {
            await remove(sub.endpoint);
            return { endpoint: sub.endpoint, ok: false, removed: true, code };
          }
          return { endpoint: sub.endpoint, ok: false, code, message: err?.message };
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    const removed = results.filter(
      (r) => r.status === "fulfilled" && r.value.removed
    ).length;

    return res.status(200).json({
      ok: true,
      sent,
      removed_stale: removed,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: r.reason?.message })),
    });
  } catch (e) {
    console.error("[push] test-send error:", e);
    return res.status(500).json({ error: "Test send failed" });
  }
};
