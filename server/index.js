// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const webpush = require("web-push");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- VAPID setup ---
const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY;
if (!PUBLIC_VAPID_KEY || !PRIVATE_VAPID_KEY) {
  console.error("Missing VAPID keys in .env");
  process.exit(1);
}
webpush.setVapidDetails(
  "mailto:admin@greenbankbristol.org",
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

// --- In-memory stores (replace with DB in prod) ---
/** { [clientId]: PushSubscriptionJSON } */
const subs = {};
/** { [clientId]: { startEnabled:boolean, jamaahEnabled:boolean, minutesBefore:number, categories:string[] } } */
const prefs = {};
/** { [clientId]: Array<{ id:string, prayer:string, startAt:number, jamaahAt?:number, url?:string, dateKey:string }> } */
const schedules = {};
/** Set of sent ids: `${clientId}:${eventId}` */
const sent = new Set();

// --- Helpers ---
const nowMs = () => Date.now();
const dateKeyOf = (ms) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

function upsert(arr, keyFn, item) {
  const i = arr.findIndex((x) => keyFn(x) === keyFn(item));
  if (i >= 0) arr[i] = item;
  else arr.push(item);
}

// --- Routes ---

// Subscription upsert
app.post("/api/push/subscribe", (req, res) => {
  const { clientId, subscription } = req.body || {};
  if (!clientId || !subscription) return res.status(400).json({ ok: false });
  subs[clientId] = subscription;
  return res.json({ ok: true });
});

// Preferences upsert
app.post("/api/push/prefs", (req, res) => {
  const { clientId, endpoint, keys, prefs: p } = req.body || {};
  if (!clientId) return res.status(400).json({ ok: false });
  // Optional: update subscription if provided
  if (endpoint && keys) subs[clientId] = { endpoint, keys };
  prefs[clientId] = {
    startEnabled: !!p?.startEnabled,
    jamaahEnabled: !!p?.jamaahEnabled,
    minutesBefore: Math.max(0, Math.min(120, parseInt(p?.minutesBefore ?? 10, 10))),
    categories: Array.isArray(p?.categories) ? p.categories : [],
  };
  return res.json({ ok: true });
});

// Today schedule upsert
// expects: { clientId, dayKey?: "YYYY-MM-DD", entries: [{prayer, startAt, jamaahAt?, url?}] }
// times must be epoch ms in local time; server compares to Date.now()
app.post("/api/push/schedule", (req, res) => {
  const { clientId, dayKey, entries } = req.body || {};
  if (!clientId || !Array.isArray(entries)) return res.status(400).json({ ok: false });
  const dk = dayKey || (entries[0]?.startAt ? dateKeyOf(entries[0].startAt) : null) || dateKeyOf(nowMs());
  const norm = entries
    .filter((e) => e && typeof e.prayer === "string" && Number.isFinite(e.startAt))
    .map((e) => ({
      id: `${dk}:${e.prayer}`, // unique per day/prayer
      dateKey: dk,
      prayer: e.prayer,
      startAt: Number(e.startAt),
      jamaahAt: Number.isFinite(e.jamaahAt) ? Number(e.jamaahAt) : undefined,
      url: e.url || "/mobile/",
    }));
  schedules[clientId] = norm;
  return res.json({ ok: true, count: norm.length });
});

// For debugging
app.get("/api/push/debug/:clientId", (req, res) => {
  const id = req.params.clientId;
  res.json({ sub: subs[id] || null, prefs: prefs[id] || null, schedule: schedules[id] || [] });
});

// --- Scheduler: check every 15s for due notifications ---
async function checkDue() {
  const t = nowMs();
  for (const clientId of Object.keys(subs)) {
    const sub = subs[clientId];
    const pf = prefs[clientId] || { startEnabled: false, jamaahEnabled: false, minutesBefore: 10 };
    const sched = schedules[clientId] || [];
    for (const entry of sched) {
      const keyStart = `${clientId}:${entry.id}:start`;
      const keyJam = `${clientId}:${entry.id}:jamaah:${pf.minutesBefore}`;

      // Start time
      if (pf.startEnabled && t >= entry.startAt && t - entry.startAt < 60_000 && !sent.has(keyStart)) {
        const payload = JSON.stringify({
          title: "Greenbank Masjid",
          body: `${entry.prayer[0].toUpperCase() + entry.prayer.slice(1)} start • ${new Date(entry.startAt).toLocaleTimeString("en-GB",{hour:'2-digit',minute:'2-digit'})}`,
          url: entry.url,
        });
        try {
          await webpush.sendNotification(sub, payload);
          sent.add(keyStart);
        } catch (e) {
          // stale subscription? drop it
          if (e.statusCode === 404 || e.statusCode === 410) {
            delete subs[clientId];
          }
        }
      }

      // Jama'ah time (N minutes BEFORE)
      if (pf.jamaahEnabled && Number.isFinite(entry.jamaahAt)) {
        const due = entry.jamaahAt - pf.minutesBefore * 60_000;
        if (t >= due && t - due < 60_000 && !sent.has(keyJam)) {
          const payload = JSON.stringify({
            title: "Greenbank Masjid",
            body: `${entry.prayer[0].toUpperCase() + entry.prayer.slice(1)} Jama‘ah in ${pf.minutesBefore} min • ${new Date(entry.jamaahAt).toLocaleTimeString("en-GB",{hour:'2-digit',minute:'2-digit'})}`,
            url: entry.url,
          });
          try {
            await webpush.sendNotification(sub, payload);
            sent.add(keyJam);
          } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) {
              delete subs[clientId];
            }
          }
        }
      }
    }
  }
}
setInterval(checkDue, 15_000);

// --- start ---
const PORT = process.env.PORT || 5179;
app.listen(PORT, () => console.log(`Push server listening on http://localhost:${PORT}`));
