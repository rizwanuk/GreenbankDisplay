// api/push/debug-state.js
export const config = { runtime: "nodejs" };
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function handler(req, res) {
  try {
    const dk = (new URL(req.url, `https://${req.headers.host}`)).searchParams.get("dk") || dayKey();

    // subscriptions meta
    let subsMeta = { exists:false, url:null, totalItems:0, sample:[] };
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "push/subscriptions.json" }, TOKEN ? { token: TOKEN } : undefined);
      const b = blobs?.find(x => x.pathname === "push/subscriptions.json") || blobs?.[0];
      subsMeta.url = b?.url || b?.downloadUrl || null;
      if (subsMeta.url) {
        const arr = await readBlobJson("push/subscriptions.json", []);
        subsMeta.exists = Array.isArray(arr);
        subsMeta.totalItems = Array.isArray(arr) ? arr.length : 0;
        subsMeta.sample = Array.isArray(arr) && arr.length ? [arr[0]] : [];
      }
    } catch {}

    // schedule meta
    let schedMeta = { exists:false, url:null, totalItems:0, sample:[] };
    try {
      const { list } = await import("@vercel/blob");
      const key = `push/schedule-${dk}.json`;
      const { blobs } = await list({ prefix: key }, TOKEN ? { token: TOKEN } : undefined);
      const b = blobs?.find(x => x.pathname === key) || blobs?.[0];
      schedMeta.url = b?.url || b?.downloadUrl || null;
      if (schedMeta.url) {
        const o = await readBlobJson(key, { entries: [] });
        const arr = o?.entries || [];
        schedMeta.exists = Array.isArray(arr);
        schedMeta.totalItems = Array.isArray(arr) ? arr.length : 0;
        schedMeta.sample = Array.isArray(arr) && arr.length ? [arr[0]] : [];
      }
    } catch {}

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
