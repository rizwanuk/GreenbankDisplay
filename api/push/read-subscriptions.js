// api/push/read-subscriptions.js
export const config = { runtime: "nodejs" };
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function readBlobJson(key, def = null) {
  try {
    const { get } = await import("@vercel/blob");
    const r = await get(key, TOKEN ? { token: TOKEN } : undefined);
    const url = r?.downloadUrl || r?.url;
    if (!url) return def;
    const txt = await (await fetch(url)).text();
    return txt ? JSON.parse(txt) : def;
  } catch { return def; }
}

export default async function handler(req, res) {
  try {
    const subs = (await readBlobJson("push/subscriptions.json", [])) || [];
    res.json({ ok: true, total: Array.isArray(subs) ? subs.length : 0, subs });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || "read_failed" });
  }
}
