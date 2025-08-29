// api/push/blob-debug.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  res.status(200).json({ ok: true, hasToken });
}
