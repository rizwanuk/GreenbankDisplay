// api/push/prefs.js
export const config = { runtime: "nodejs" };

async function readBodyJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(buf || "{}"); } catch { return {}; }
}

async function readBlobJson(key, def = null) {
  try {
    const { get } = await import("@vercel/blob");
    const r = await get(key, { allowPrivate: true });
    if (r?.body?.text) {
      const txt = await r.body.text();
      return txt ? JSON.parse(txt) : def;
    }
    const url = r?.downloadUrl || r?.url;
    if (!url) return def;
    const fr = await fetch(url);
    const txt = await fr.text();
    return txt ? JSON.parse(txt) : def;
  } catch {
    return def;
  }
}
async function writeBlobJson(key, data) {
  const { put } = await import("@vercel/blob");
  return put(key, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const body = await readBodyJson(req);
    const endpoint = body?.endpoint || body?.subscription?.endpoint;
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
