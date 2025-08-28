// api/push/cron.js
import webPush from "web-push";
import { get, put } from "@vercel/blob";

const {
  CRON_TOKEN,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = "mailto:admin@example.com",
  PUSH_TOLERANCE_MIN = "3",    // minutes window to catch times
  PUSH_BATCH_LIMIT = "500"     // safety cap
} = process.env;

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function readJson(key, def = null) {
  try {
    const res = await get(key, { allowPrivate: true });
    const txt = await res.body?.text();
    return txt ? JSON.parse(txt) : def;
  } catch {
    return def;
  }
}
async function writeJson(key, data) {
  await put(key, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
  });
}

function within(now, target, tolMs) {
  return Math.abs(target - now) <= tolMs;
}

function makeEventsFromEntry(e) {
  // Creates normalized “events” so we can notify for start and jamaah separately
  const out = [];
  if (Number.isFinite(e.startAt)) {
    out.push({ kind: "start", at: e.startAt, prayer: e.prayer, url: e.url });
  }
  if (Number.isFinite(e.jamaahAt)) {
    out.push({ kind: "jamaah", at: e.jamaahAt, prayer: e.prayer, url: e.url });
  }
  return out;
}

function titleFor(ev) {
  const p = ev.prayer?.toUpperCase?.() || ev.prayer || "Prayer";
  return ev.kind === "jamaah" ? `${p} Jama'ah` : `${p} Start`;
}
function bodyFor(ev) {
  return ev.kind === "jamaah" ? "Congregational prayer time." : "Prayer time has started.";
}

export default async function handler(req, res) {
  // --- Security: token required ---
  const token = req.query?.token || req.headers["x-cron-token"];
  if (!CRON_TOKEN || token !== CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  // --- Time window (± tolerance) ---
  const nowOverride = req.query?.now ? Number(req.query.now) : null; // for testing
  const now = Number.isFinite(nowOverride) ? nowOverride : Date.now();
  const tolMs = Math.max(1, parseInt(PUSH_TOLERANCE_MIN, 10)) * 60 * 1000;

  const dk = dayKey(new Date(now));
  const scheduleKey = `push/schedule-${dk}.json`;
  const sentKey = `push/sent-${dk}.json`;
  const subsKey = `push/subscriptions.json`;

  // Load schedule + subscriptions + sent-log
  const schedule = await readJson(scheduleKey, { dk, entries: [] });
  const subs = await readJson(subsKey, []);
  let sent = (await readJson(sentKey, {})) || {};

  if (!Array.isArray(schedule.entries) || schedule.entries.length === 0) {
    return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no schedule" });
  }
  if (!Array.isArray(subs) || subs.length === 0) {
    return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no subscribers" });
  }

  // Build due events (within tolerance window)
  const windowStart = now - tolMs;
  const windowEnd = now + tolMs;

  const due = [];
  for (const entry of schedule.entries) {
    for (const ev of makeEventsFromEntry(entry)) {
      if (ev.at >= windowStart && ev.at <= windowEnd) {
        const id = `${dk}:${ev.prayer}:${ev.kind}:${ev.at}`;
        if (!sent[id]) {
          due.push({ ...ev, id });
        }
      }
    }
  }

  if (due.length === 0) {
    return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no due events" });
  }

  // Cap notifications to avoid overload
  const cap = Math.max(1, parseInt(PUSH_BATCH_LIMIT, 10));
  let sentCount = 0;
  const errors = [];

  for (const ev of due) {
    const payload = JSON.stringify({
      title: titleFor(ev),
      body: bodyFor(ev),
      url: ev.url || "/mobile/",
      tag: ev.id, // dedupe tag
    });

    // Send to all subscribers
    await Promise.all(
      subs.slice(0, cap).map(async (sub) => {
        try {
          await webPush.sendNotification(sub, payload);
        } catch (err) {
          // Collect errors but continue; you can later prune gone subscribers on 410/404
          errors.push({ endpoint: sub?.endpoint, code: err?.statusCode, msg: err?.message });
        }
      })
    );

    sent[ev.id] = true;
    sentCount += 1;
  }

  // Persist sent-log
  await writeJson(sentKey, sent);

  res.json({
    ok: true,
    dk,
    checked: due.length,
    sentCount,
    errors,
  });
}
