// api/push/vapid.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
    const pub = process.env.VAPID_PUBLIC_KEY || "";
    if (!pub) {
      console.error("VAPID_PUBLIC_KEY missing");
      return res.status(500).json({ ok: false, error: "Missing VAPID_PUBLIC_KEY" });
    }
    return res.json({ ok: true, publicKey: pub });
  } catch (e) {
    console.error("vapid error:", e);
    return res.status(500).json({ ok: false, error: "vapid failed" });
  }
}
