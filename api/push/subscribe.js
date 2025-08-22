// api/push/subscribe.js
const { add, IS_VERCEL } = require("../_lib/subscriptions");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const sub = req.body || {};
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ error: "Invalid subscription" });
    }
    await add(sub);
    if (IS_VERCEL) {
      console.warn(
        "[push] Stored subscription in memory only (Vercel). Configure a real DB/KV for persistence."
      );
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[push] subscribe error:", e);
    return res.status(500).json({ error: "Subscribe failed" });
  }
};
