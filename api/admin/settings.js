// api/admin/settings.js
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

/* ------------------ helpers ------------------ */

function normalizePrivateKey(keyRaw) {
  if (!keyRaw) return "";
  let k = String(keyRaw).trim();

  if (k.includes("\\n")) return k.replace(/\\n/g, "\n");
  if (k.includes("\n")) return k;

  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";

  k = k.replace(header, "").replace(footer, "").replace(/\s+/g, "");
  const wrapped = k.match(/.{1,64}/g)?.join("\n") || k;

  return `${header}\n${wrapped}\n${footer}\n`;
}

async function verifyGoogleIdToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    const e = new Error("Missing Bearer token");
    e.statusCode = 401;
    throw e;
  }

  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  if (!clientId) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId,
  });

  const payload = ticket.getPayload() || {};
  const email = String(payload.email || "").toLowerCase();

  if (!email || !payload.email_verified) {
    const e = new Error("Email not verified");
    e.statusCode = 401;
    throw e;
  }

  return { email };
}

async function getSheetsClient() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";

  if (!email || !keyRaw) {
    throw new Error("Missing service account env vars");
  }

  const privateKey = normalizePrivateKey(keyRaw);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

/* ------------------ sheet helpers ------------------ */

const SETTINGS_SHEET_NAME =
  process.env.GOOGLE_SETTINGS_SHEET_NAME || "Settings";

async function getUserRoleFromSheet(sheets, sheetId, email) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SETTINGS_SHEET_NAME}!A:C`,
  });

  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    const [group, key, value] = rows[i] || [];
    if (
      group === "adminUsers" &&
      String(key || "").toLowerCase() === email
    ) {
      return String(value || "").toLowerCase();
    }
  }
  return "";
}

async function requireRole(req, sheets, sheetId, allowedRoles) {
  const { email } = await verifyGoogleIdToken(req);
  const role = await getUserRoleFromSheet(sheets, sheetId, email);

  if (!allowedRoles.includes(role)) {
    const e = new Error("Not allowlisted");
    e.statusCode = 403;
    throw e;
  }

  return { email, role };
}

/* ------------------ handler ------------------ */

export default async function handler(req, res) {
  try {
    const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
    if (!sheetId) {
      throw new Error("Missing GOOGLE_SHEET_ID");
    }

    const sheets = await getSheetsClient();

    // allow admin + editor
    const { email, role } = await requireRole(
      req,
      sheets,
      sheetId,
      ["admin", "editor"]
    );

    /* ---------- GET ---------- */
    if (req.method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SETTINGS_SHEET_NAME}!A:C`,
      });

      return res.status(200).json({
        ok: true,
        email,
        role,
        rows: result.data.values || [],
      });
    }

    /* ---------- POST ---------- */
    if (req.method === "POST") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      const updatesIn = Array.isArray(body.updates)
        ? body.updates
        : [];

      if (!updatesIn.length) {
        return res.status(400).json({
          ok: false,
          error: "No updates provided",
        });
      }

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SETTINGS_SHEET_NAME}!A:C`,
      });

      const rows = existing.data.values || [];
      const index = new Map();

      for (let i = 1; i < rows.length; i++) {
        const [g, k] = rows[i] || [];
        if (g && k) index.set(`${g}||${k}`, i + 1);
      }

      const nowIso = new Date().toISOString();
      const updates = [
        ...updatesIn,
        { Group: "meta", Key: "lastUpdated", Value: nowIso },
      ];

      const data = [];
      const applied = [];
      const skipped = [];

      for (const u of updates) {
        const g = (u.Group || "").trim();
        const k = (u.Key || "").trim();
        const v = String(u.Value ?? "");

        const rowNum = index.get(`${g}||${k}`);
        if (!rowNum) {
          skipped.push({ Group: g, Key: k });
          continue;
        }

        data.push({
          range: `${SETTINGS_SHEET_NAME}!C${rowNum}`,
          values: [[v]],
        });

        applied.push({ Group: g, Key: k, Value: v });
      }

      if (!data.length) {
        return res.status(400).json({
          ok: false,
          error: "No valid updates",
          skipped,
        });
      }

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "RAW",
          data,
        },
      });

      return res.status(200).json({
        ok: true,
        email,
        role,
        applied,
        skipped,
        lastUpdated: nowIso,
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    const msg = err?.message || String(err);

    if (err?.statusCode) {
      return res.status(err.statusCode).json({ ok: false, error: msg });
    }

    if (msg.startsWith("Missing ")) {
      return res.status(500).json({ ok: false, error: msg });
    }

    return res.status(401).json({ ok: false, error: msg });
  }
}
