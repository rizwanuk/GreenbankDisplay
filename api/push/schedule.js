// api/push/schedule.js
const { enqueueDay, wasQueuedToday } = require("../_lib/queue");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { entries, dayKey } = req.body || {};
    if (!Array.isArray(entries) || !dayKey) {
      return res.status(400).json({ error: "Bad Request" });
    }

    if (await wasQueuedToday(dayKey)) {
      return res.status(200).json({ ok: true, alreadyQueued: true });
    }

    const count = await enqueueDay(entries, dayKey);
    return res.status(200).json({ ok: true, queued: count });
  } catch (e) {
    console.error("[push] schedule error:", e);
    return res.status(500).json({ error: "Schedule failed" });
  }
};
