// api/push/cron.js
const { readAll, remove } = require("../_lib/subscriptions");
const { getPrefs } = require("../_lib/prefs");
const { dequeueDue, requeueAt } = require("../_lib/queue");
const { sendPush } = require("../_lib/push");

// Runs every minute via vercel.json crons
module.exports = async (_req, res) => {
  try {
    const nowCutoff = Date.now() + 5000; // small lookahead
    const due = await dequeueDue(nowCutoff);
    if (!due.length) return res.status(200).json({ ok: true, sent: 0 });

    const subs = await readAll();
    if (!subs.length) return res.status(200).json({ ok: true, sent: 0, reason: "no subs" });

    let sent = 0;
    for (const job of due) {
      // job: { type:'start'|'jamaah', prayer, startAt, jamaahAt, url }
      for (const sub of subs) {
        const prefs = (await getPrefs(sub.endpoint)) || {};
        const startEnabled = !!prefs.startEnabled;
        const jamaahEnabled = !!prefs.jamaahEnabled;
        const minutesBefore = Number.isFinite(+prefs.minutesBefore) ? +prefs.minutesBefore : 5;

        if (job.type === "start" && !startEnabled) continue;

        if (job.type === "jamaah") {
          if (!jamaahEnabled) continue;
          const adj = (job.jamaahAt || 0) - minutesBefore * 60 * 1000;
          if (Date.now() + 1000 < adj) {
            // not yet time for the offset — requeue to fire later
            await requeueAt(job, adj);
            continue;
          }
        }

        const title = "Greenbank Masjid";
        const body =
          job.type === "start"
            ? `${job.prayer.toUpperCase()} start time`
            : `${job.prayer.toUpperCase()} jamāʿah soon`;

        const ok = await sendPush(sub, { title, body, url: job.url || "/mobile/" });
        if (ok) sent++;
        else {
          // send failed; if endpoint is gone, remove it inside sendPush
        }
      }
    }

    return res.status(200).json({ ok: true, sent });
  } catch (e) {
    console.error("[push] cron error:", e);
    return res.status(500).json({ error: "Cron failed" });
  }
};
