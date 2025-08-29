// api/push/subscribe.js
export const config = { runtime: "nodejs" };

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/* utils */
async function readBodyJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(buf || "{}"); } catch { return {}; }
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
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/* handler */
export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    if (!TOKEN) return res.status(500).json({ ok: false, error: "server_missing_blob_token" });

    const body = await readBodyJson(req);
    const sub = body?.subscription || body;
    if (!sub?.endpoint) return res.status(400).json({ ok: false, error: "invalid_subscription" });

    const key = "push/subscriptions.json";
    let subs = (await readBlobJson(key, [])) || [];
    if (!Array.isArray(subs)) subs = [];

    const nowIso = new Date().toISOString();
    const record = { ...sub, updatedAt: nowIso };

    const idx = subs.findIndex((s) => s?.endpoint === sub.endpoint);
    if (idx >= 0) subs[idx] = record; else subs.push(record);

    await writeBlobJson(key, subs);
    return res.json({ ok: true, count: subs.length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "subscribe_failed" });
  }
}
