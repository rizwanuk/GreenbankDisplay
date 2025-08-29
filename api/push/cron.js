// api/push/cron.js
export const config = { runtime: "nodejs" };

import webpush from "web-push";

const TOKEN            = process.env.BLOB_READ_WRITE_TOKEN;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY= process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT    = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const CRON_TOKEN       = process.env.CRON_TOKEN; // optional but recommended

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function dayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function readBlobJson(key, def = null) {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key }, TOKEN ? { token: TOKEN } : undefined);
    const b = blobs?.find(x => x.pathname === key) || blobs?.[0];
    const url = b?.url || b?.downloadUrl;
    if (!url) return def;
    const txt = await (await fetch(url)).text();
    return txt ? JSON.parse(txt) : def;
  } catch { return def; }
}

async function writeBlobJson(key, data) {
  const { put } = await import("@vercel/blob");
  return put(key, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    ...(TOKEN ? { token: TOKEN } : {}),
  });
}

// derive minutes-before per endpoint; falls back to entry.defaultMinutesBefore or 10
function getMinutesBefore(endpoint, entry, prefsMap) {
  const ep = prefsMap?.[endpoint]?.prefs || {};
  const v = Number(ep.minutesBeforeJamaah);
  if (Number.isFinite(v) && v >= 0) return v;
  const def = Number(entry?.defaultMinutesBefore);
  return Number.isFinite(def) && def >= 0 ? def : 10;
}

// convert an entry's base time to ms
function toMs(x) {
  if (typeof x === "number") return x;
  const n = Date.parse(x || "");
  return Number.isFinite(n) ? n : NaN;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (!TOKEN) return res.status(500).json({ ok: false, error: "server_missing_blob_token" });

  // Optional token check (header or query param)
  const url = new URL(req.url, `https://${req.headers.host}`);
  const hdrToken = req.headers["x-cron-token"];
  const qToken   = url.searchParams.get("token");
  if (CRON_TOKEN && hdrToken !== CRON_TOKEN && qToken !== CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized_cron" });
  }

  try {
    const dk  = url.searchParams.get("dk") || dayKey();
    const dry = url.searchParams.get("dry") === "1";

    // Load schedule (for the day), subscriptions, and per-endpoint prefs
    const schedKey = `push/schedule-${dk}.json`;
    const schedule = (await readBlobJson(schedKey, { entries: [] })) || { entries: [] };
    let   subs     = (await readBlobJson("push/subscriptions.json", [])) || [];
    const prefsMap = (await readBlobJson("push/prefs.json", {})) || {};

    if (!Array.isArray(subs)) subs = [];
    const entries = Array.isArray(schedule.entries) ? schedule.entries : [];

    const now      = Date.now();
    const windowMs = 10 * 60 * 1000; // treat as due if within the last 10 minutes
    const results  = [];
    const toRemove = new Set();
    let sentCount  = 0;

    // We support two kinds of entries:
    //  A) Global fire-at entries:   { ts: <ms>, ... } with perUserOffset !== true
    //  B) Per-user offset entries:  { baseTs: <ms> OR ts: <ms>, perUserOffset: true, defaultMinutesBefore?: number }
    //
    // In (B), each user can pick `prefs.minutesBeforeJamaah`, and we compute fireTs = baseTs - minutes*60s*1000 per endpoint.
    for (let i = 0; i < entries.length; i++) {
      const n = entries[i];

      const perUser = !!n.perUserOffset;
      const baseTs  = Number.isFinite(n.baseTs) ? n.baseTs : toMs(n.ts);
      if (!Number.isFinite(baseTs)) continue;

      if (perUser) {
        // Track who we've already sent to for this entry
        const sentFor = new Set(Array.isArray(n.sentFor) ? n.sentFor : []);
        for (const sub of subs) {
          const endpoint = sub?.endpoint;
          if (!endpoint || sentFor.has(endpoint)) continue;

          const minutes = getMinutesBefore(endpoint, n, prefsMap);
          const fireTs  = baseTs - minutes * 60 * 1000;

          if (Number.isFinite(fireTs) && fireTs <= now && now - fireTs < windowMs) {
            if (!dry) {
              try {
                const payload = JSON.stringify({
                  title: n.title || "Greenbank Masjid",
                  body:  n.body  || "",
                  tag:   n.tag   || `jamaah-${dk}`,
                  data:  n.data  || {},
                });
                await webpush.sendNotification(sub, payload, { TTL: 300 });
                sentCount++;
                results.push({ endpoint, ok: true, minutes });
                sentFor.add(endpoint);
              } catch (e) {
                if (e?.statusCode === 410 || e?.statusCode === 404) toRemove.add(endpoint);
                results.push({ endpoint, ok: false, code: e?.statusCode, message: e?.body || e?.message });
              }
            }
          }
        }
        // Persist per-entry sent list so repeated cron ticks don't resend to the same endpoint
        if (sentFor.size !== (n.sentFor?.length || 0)) {
          entries[i] = { ...n, sentFor: Array.from(sentFor) };
        }
      } else {
        // Global fire-at timestamp: send to everyone once, then mark sentAt
        const due = baseTs <= now && now - baseTs < windowMs && !n.sentAt;
        if (due && !dry) {
          const payload = JSON.stringify({
            title: n.title || "Greenbank Masjid",
            body:  n.body  || "",
            tag:   n.tag   || "announcement",
            data:  n.data  || {},
          });

          for (const sub of subs) {
            try {
              await webpush.sendNotification(sub, payload, { TTL: 300 });
              sentCount++;
              results.push({ endpoint: sub.endpoint, ok: true });
            } catch (e) {
              if (e?.statusCode === 410 || e?.statusCode === 404) toRemove.add(sub.endpoint);
              results.push({ endpoint: sub.endpoint, ok: false, code: e?.statusCode, message: e?.body || e?.message });
            }
          }
          // mark globally sent to avoid duplicates
          entries[i] = { ...n, sentAt: new Date().toISOString() };
        }
      }
    }

    // Write back updated schedule (with sentFor/sentAt markers)
    try {
      await writeBlobJson(schedKey, { ...schedule, entries });
    } catch (e) {
      results.push({ scheduleWriteError: e?.message || String(e) });
    }

    // Prune dead subscriptions if needed
    if (toRemove.size > 0) {
      try {
        subs = subs.filter(s => !toRemove.has(s.endpoint));
        await writeBlobJson("push/subscriptions.json", subs);
      } catch (e) {
        results.push({ pruneError: e?.message || String(e) });
      }
    }

    return res.json({ ok: true, dk, checked: entries.length, sentCount, pruned: toRemove.size, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "cron_failed" });
  }
}
