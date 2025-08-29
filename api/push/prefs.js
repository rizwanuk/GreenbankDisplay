// api/push/prefs.js
export const config = { runtime: "nodejs" };

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  if (!TOKEN) return res.status(500).json({ ok: false, error: "server_missing_blob_token" });

  try {
    const body = await readBodyJson(req);
    const endpoint = body?.endpoint;
    const prefs = body?.prefs || {};
    const clientId = body?.clientId || null;

    if (!endpoint) return res.status(400).json({ ok: false, error: "missing_endpoint" });

    const key = "push/prefs.json";
    let data = (await readBlobJson(key, {})) || {};
    if (typeof data !== "object" || Array.isArray(data)) data = {};

    data[endpoint] = {
      ...(data[endpoint] || {}),
      prefs,
      clientId,
      updatedAt: new Date().toISOString(),
    };

    await writeBlobJson(key, data);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "prefs_failed" });
  }
}
