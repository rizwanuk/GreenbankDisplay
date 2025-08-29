// api/push/debug-state.js
export const config = { runtime: "nodejs" };
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function getBlob(key) {
  const out = { key, exists: false, url: null, textLen: 0, totalItems: 0, parseError: null };
  try {
    const { get } = await import("@vercel/blob");
    const r = await get(key, TOKEN ? { token: TOKEN } : undefined);
    const url = r?.downloadUrl || r?.url || null;
    out.url = url;
    if (!url) return out;
    const resp = await fetch(url);
    const txt = await resp.text();
    out.textLen = txt.length;
    if (txt) {
      try {
        const json = JSON.parse(txt);
        out.totalItems = Array.isArray(json) ? json.length : 0;
        out.exists = true;
        // include first 1 item in a safe way
        out.sample = Array.isArray(json) && json.length ? [json[0]] : [];
      } catch (e) {
        out.parseError = e.message;
      }
    }
    return out;
  } catch (e) {
    out.error = e.message || String(e);
    return out;
  }
}

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function handler(req, res) {
  try {
    const dk = (new URL(req.url, `https://${req.headers.host}`)).searchParams.get("dk") || dayKey();
    const subsMeta = await getBlob("push/subscriptions.json");
    const schedMeta = await getBlob(`push/schedule-${dk}.json`);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      hasToken: !!TOKEN,
      dk,
      subscriptionsMeta: subsMeta,
      scheduleMeta: schedMeta,
      subscriptions: subsMeta.totalItems,
      nextEntries: [],
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || "debug_failed" });
  }
}
