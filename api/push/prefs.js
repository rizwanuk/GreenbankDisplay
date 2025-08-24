// api/push/prefs.js
const { readAll } = require("../_lib/subscriptions");
const { savePrefs } = require("../_lib/prefs");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { endpoint, prefs } = req.body || {};
    if (!endpoint || !prefs) return res.status(400).json({ error: "Bad Request" });

    const list = await readAll();
    const sub = list.find((s) => s.endpoint === endpoint);
    if (!sub) return res.status(404).json({ error: "Unknown subscription" });

    await savePrefs(endpoint, {
      startEnabled: !!prefs.startEnabled,
      jamaahEnabled: !!prefs.jamaahEnabled,
      minutesBefore: Number.isFinite(+prefs.minutesBefore) ? Math.max(0, +prefs.minutesBefore) : 5,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[push] prefs error:", e);
    return res.status(500).json({ error: "Prefs save failed" });
  }
};
