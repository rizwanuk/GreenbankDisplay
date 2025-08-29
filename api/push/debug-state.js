// api/push/debug-state.js
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
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default async function handler(req, res) {
  try {
    const subs = (await readBlobJson("push/subscriptions.json", [])) || [];
    const dk = (new URL(req.url, `https://${req.headers.host}`)).searchParams.get("dk") || dayKey();
    const schedule = (await readBlobJson(`push/schedule-${dk}.json`, { entries: [] })) || { entries: [] };
    res.json({
      ok: true,
      dk,
      subscriptions: subs.length,
      nextEntries: (schedule.entries || [])
        .slice()
        .sort((a,b) => (+new Date(a.ts)) - (+new Date(b.ts)))
        .slice(0, 5),
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || "debug_failed" });
  }
}
