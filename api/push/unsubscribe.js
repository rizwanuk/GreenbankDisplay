// api/push/unsubscribe.js
const { remove } = require("../_lib/subscriptions");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

    const info = await remove(endpoint);
    return res.status(200).json({ ok: true, ...info });
  } catch (e) {
    console.error("[push] unsubscribe error:", e);
    return res.status(500).json({ error: "Unsubscribe failed" });
  }
};
