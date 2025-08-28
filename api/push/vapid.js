// api/push/vapid.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  if (!pub) return res.status(500).json({ ok: false, error: "Missing VAPID_PUBLIC_KEY" });
  return res.json({ ok: true, publicKey: pub });
}
