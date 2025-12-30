import { OAuth2Client } from "google-auth-library";

const ALLOWLIST = new Set(["rizwan.uk@gmail.com", "eid.bristol@gmail.com"]);

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing Bearer token" });
    }

    const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
    if (!clientId) {
      return res.status(500).json({ ok: false, error: "Missing GOOGLE_OAUTH_CLIENT_ID env var" });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });

    const payload = ticket.getPayload() || {};
    const email = String(payload.email || "").toLowerCase();
    const emailVerified = Boolean(payload.email_verified);

    if (!email || !emailVerified) {
      return res.status(401).json({ ok: false, error: "Email not verified" });
    }

    const allowed = ALLOWLIST.has(email);
    if (!allowed) {
      return res.status(403).json({ ok: false, error: "Not allowlisted", email });
    }

    return res.status(200).json({
      ok: true,
      email,
      name: payload.name || "",
      picture: payload.picture || "",
    });
  } catch (err) {
    return res.status(401).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}
