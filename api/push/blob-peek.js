// api/push/blob-peek.js
export const config = { runtime: "nodejs" };
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export default async function handler(req, res) {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "push/" }, TOKEN ? { token: TOKEN } : undefined);
    res.json({
      ok: true,
      count: blobs.length,
      items: blobs.map(b => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
        url: b.url || b.downloadUrl
      }))
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: e?.message || "peek_failed" });
  }
}
