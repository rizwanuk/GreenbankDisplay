// api/push/cron.js
export const config = { runtime: "nodejs" };

import webpush from "web-push";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
const CRON_TOKEN        = process.env.CRON_TOKEN; // set this in Vercel envs

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
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
  } catch {
    return def;
  }
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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }
  if (!TOKEN) {
    return res.status(500).json({ ok: false, error: "server_missing_blob_token" });
  }

  // --- Auth for cron ping (header or query) ---
  const url = new URL(req.url, `https://${req.headers.host}`);
  const hdrToken = req.headers["x-cron-token"];
  const qToken = url.searchParams.get("token");
  if (CRON_TOKEN && hdrToken !== CRON_TOKEN && qToken !== CRON_TOKEN) {
    return res.status(401).json({ ok: false, error: "unauthorized_cron" });
  }

  try {
    const dk = url.searchParams.get("dk") || dayKey();
    const dry = url.searchParams.get("dry") === "1"; // optional: test run without sending

    // Load schedule & subscriptions
    const schedKey = `push/schedule-${dk}.json`;
    const schedule = (await readBlobJson(schedKey, { entries: [] })) || { entries: [] };
    let subs = (await readBlobJson("push/subscriptions.json", [])) || [];
    if (!Array.isArray(subs)) subs = [];

    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // consider due if within last 10 minutes
    // Prevent duplicates: only send entries that do NOT have sentAt yet
    const entries = Array.isArray(schedule.entries) ? schedule.entries : [];
    const due = entries.filter(e => {
      const ts = typeof e.ts === "number" ? e.ts : Date.parse(e.ts || "");
      return !e.sentAt && Number.isFinite(ts) && ts <= now && now - ts < windowMs;
    });

    const results = [];
    const toRemove = new Set();
    let sentCount = 0;

    if (!dry) {
      for (const n of due) {
        const payload = JSON.stringify({
          title: n.title || "Greenbank Masjid",
          body: n.body || "",
          tag: n.tag || "announcement",
          data: n.data || {},
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 300 });
            sentCount++;
            results.push({ endpoint: sub.endpoint, ok: true });
          } catch (e) {
            if (e?.statusCode === 410 || e?.statusCode === 404) toRemove.add(sub.endpoint);
            results.push({
              endpoint: sub.endpoint,
              ok: false,
              code: e?.statusCode,
              message: e?.body || e?.message,
            });
          }
        }
      }
    }

    // Mark sent entries to avoid re-sends on next cron tick
    if (due.length > 0) {
      const iso = new Date().toISOString();
      const updated = entries.map(e => (due.includes(e) ? { ...e, sentAt: iso } : e));
      try {
        await writeBlobJson(schedKey, { ...schedule, entries: updated });
      } catch (e) {
        results.push({ scheduleWriteError: e?.message || String(e) });
      }
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

    return res.json({
      ok: true,
      dk,
      checked: due.length,
      sentCount,
      pruned: toRemove.size,
      dryRun: dry,
      results,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "cron_failed" });
  }
}
