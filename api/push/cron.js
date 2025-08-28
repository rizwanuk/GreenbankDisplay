// api/push/cron.js  (PRODUCTION)
export const config = { runtime: "nodejs" };

// ----- helpers -----
function getQuery(req) {
  try {
    const host = req.headers?.host || "localhost";
    const u = new URL(req.url, `https://${host}`);
    return Object.fromEntries(u.searchParams.entries());
  } catch {
    return {};
  }
}
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function makeEventsFromEntry(e) {
  const out = [];
  if (Number.isFinite(e.startAt)) out.push({ kind: "start", at: e.startAt, prayer: e.prayer, url: e.url });
  if (Number.isFinite(e.jamaahAt)) out.push({ kind: "jamaah", at: e.jamaahAt, prayer: e.prayer, url: e.url });
  return out;
}
const titleFor = (ev) =>
  ev.kind === "jamaah" ? `${(ev.prayer || "").toUpperCase()} Jama'ah` : `${(ev.prayer || "").toUpperCase()} Start`;
const bodyFor = (ev) =>
  ev.kind === "jamaah" ? "Congregational prayer time." : "Prayer time has started.";

// ----- Blob JSON (PUBLIC store) -----
async function readBlobJson(key, def = null) {
  try {
    const { get } = await import("@vercel/blob");
    const r = await get(key); // public store → no allowPrivate
    // Try streaming body (node side)
    if (r?.body?.text) {
      const txt = await r.body.text();
      return txt ? JSON.parse(txt) : def;
    }
    // Fallback to URL fetch
    const url = r?.downloadUrl || r?.url;
    if (url) {
      const fr = await fetch(url);
      const txt = await fr.text();
      return txt ? JSON.parse(txt) : def;
    }
    return def;
  } catch {
    return def; // treat not-found/forbidden as default
  }
}
async function writeBlobJson(key, data) {
  const { put } = await import("@vercel/blob");
  return put(key, JSON.stringify(data), {
    access: "public",                // ✅ PUBLIC store requires "public"
    contentType: "application/json",
  });
}

export default async function handler(req, res) {
  const {
    CRON_TOKEN,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_SUBJECT = "mailto:admin@example.com",
    PUSH_TOLERANCE_MIN = "3",
    PUSH_BATCH_LIMIT = "500",
  } = process.env;

  try {
    // --- Auth ---
    const q = getQuery(req);
    const hdrToken =
      req.headers["x-cron-token"] ||
      req.headers["X-Cron-Token"] ||
      req.headers["x-cron_token"];
    const token = q.token || hdrToken;
    if (!CRON_TOKEN || token !== CRON_TOKEN) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    // --- Setup web-push inside try/catch ---
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ ok: false, error: "VAPID keys missing" });
    }
    const webPush = (await import("web-push")).default;
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    // --- Window & keys ---
    const nowParam = Number(q.now);
    const now = Number.isFinite(nowParam) ? nowParam : Date.now();
    const tolMs = Math.max(1, parseInt(PUSH_TOLERANCE_MIN, 10)) * 60 * 1000;

    const dk = dayKey(new Date(now));
    const scheduleKey = `push/schedule-${dk}.json`;
    const sentKey = `push/sent-${dk}.json`;
    const subsKey = `push/subscriptions.json`;

    // --- Read schedule/subs/sent (tolerant) ---
    const schedule = (await readBlobJson(scheduleKey, { dk, entries: [] })) || { dk, entries: [] };
    let subs = (await readBlobJson(subsKey, [])) || [];
    let sent = (await readBlobJson(sentKey, {})) || {};

    if (!Array.isArray(schedule.entries) || schedule.entries.length === 0) {
      return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no schedule" });
    }
    if (!Array.isArray(subs) || subs.length === 0) {
      return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no subscribers" });
    }

    // --- Determine due events ---
    const windowStart = now - tolMs;
    const windowEnd = now + tolMs;

    const due = [];
    for (const entry of schedule.entries) {
      for (const ev of makeEventsFromEntry(entry)) {
        if (ev.at >= windowStart && ev.at <= windowEnd) {
          const id = `${dk}:${ev.prayer}:${ev.kind}:${ev.at}`;
          if (!sent[id]) due.push({ ...ev, id });
        }
      }
    }
    if (due.length === 0) {
      return res.json({ ok: true, dk, checked: 0, sentCount: 0, reason: "no due events" });
    }

    // --- Send notifications ---
    const cap = Math.max(1, parseInt(PUSH_BATCH_LIMIT, 10));
    let sentCount = 0;
    const errors = [];
    const toRemove = new Set();

    for (const ev of due) {
      const payload = JSON.stringify({
        title: titleFor(ev),
        body: bodyFor(ev),
        url: ev.url || "/mobile/",
        tag: ev.id,
      });

      await Promise.all(
        subs.slice(0, cap).map(async (sub) => {
          try {
            await webPush.sendNotification(sub, payload);
          } catch (err) {
            const code = err?.statusCode || err?.code;
            // mark bad endpoints to prune
            if (code === 404 || code === 410) toRemove.add(sub.endpoint);
            errors.push({ endpoint: sub?.endpoint, code, msg: err?.message });
          }
        })
      );

      sent[ev.id] = true;
      sentCount += 1;
    }

    // --- Persist sent markers; prune dead subs if any ---
    try {
      await writeBlobJson(sentKey, sent);
    } catch (e) {
      errors.push({ persist: "sent", msg: e?.message || String(e) });
    }

    if (toRemove.size > 0) {
      try {
        subs = subs.filter((s) => !toRemove.has(s.endpoint));
        await writeBlobJson(subsKey, subs);
      } catch (e) {
        errors.push({ persist: "subs", msg: e?.message || String(e) });
      }
    }

    return res.json({ ok: true, dk, checked: due.length, sentCount, pruned: toRemove.size, errors });
  } catch (e) {
    // Always return JSON, never crash
    return res.status(500).json({ ok: false, error: e?.message || "cron failed" });
  }
}
