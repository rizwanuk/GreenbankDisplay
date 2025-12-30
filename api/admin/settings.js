import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const ALLOWLIST = new Set(["rizwan.uk@gmail.com", "eid.bristol@gmail.com"]);

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

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Missing Bearer token");

  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  if (!clientId) throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID");

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: token, audience: clientId });
  const payload = ticket.getPayload() || {};

  const email = String(payload.email || "").toLowerCase();
  const emailVerified = Boolean(payload.email_verified);
  if (!email || !emailVerified) throw new Error("Email not verified");

  if (!ALLOWLIST.has(email)) {
    const e = new Error("Not allowlisted");
    e.statusCode = 403;
    throw e;
  }

  return { email };
}

async function getSheetsClient() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  if (!email || !keyRaw) throw new Error("Missing service account env vars");

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

// Expect Settings sheet columns: Group | Key | Value (headers in row 1)
const SETTINGS_SHEET_NAME = process.env.GOOGLE_SETTINGS_SHEET_NAME || "Settings";

function safeJsonParse(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

export default async function handler(req, res) {
  try {
    const { email } = await requireAdmin(req);

    const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
    if (!sheetId) throw new Error("Missing GOOGLE_SHEET_ID");

    const sheets = await getSheetsClient();

    if (req.method === "GET") {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SETTINGS_SHEET_NAME}!A:C`,
      });

      const rows = result.data.values || [];
      return res.status(200).json({ ok: true, email, rows });
    }

    if (req.method === "POST") {
      const body = safeJsonParse(req.body);
      const updatesIn = Array.isArray(body?.updates) ? body.updates : [];

      if (!updatesIn.length) {
        return res.status(400).json({ ok: false, error: "No updates provided" });
      }

      // Read all rows so we can find row numbers for (Group, Key)
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${SETTINGS_SHEET_NAME}!A:C`,
      });

      const rows = existing.data.values || [];

      // Build index: "Group||Key" -> rowNumber (1-based in sheet)
      const idx = new Map();
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] || [];
        const g = (r[0] || "").toString().trim();
        const k = (r[1] || "").toString().trim();
        if (g && k) idx.set(`${g}||${k}`, i + 1);
      }

      // Always bump meta.lastUpdated on any save
      const nowIso = new Date().toISOString();
      const updates = [
        ...updatesIn,
        { Group: "meta", Key: "lastUpdated", Value: nowIso },
      ];

      const data = [];
      const applied = [];
      const skipped = [];
      let needsAppendLastUpdated = false;

      for (const u of updates) {
        const g = (u?.Group || u?.group || "").toString().trim();
        const k = (u?.Key || u?.key || "").toString().trim();
        const v = (u?.Value ?? u?.value ?? "").toString();

        if (!g || !k) {
          skipped.push({ reason: "Missing Group/Key", update: u });
          continue;
        }

        const rowNum = idx.get(`${g}||${k}`);
        if (!rowNum) {
          // If meta.lastUpdated doesn't exist, we will append it
          if (g === "meta" && k === "lastUpdated") {
            needsAppendLastUpdated = true;
            continue;
          }

          skipped.push({ reason: "Not found in sheet", Group: g, Key: k });
          continue;
        }

        // Column C is Value
        const range = `${SETTINGS_SHEET_NAME}!C${rowNum}`;
        data.push({ range, values: [[v]] });
        applied.push({ Group: g, Key: k, Value: v });
      }

      if (!data.length && !needsAppendLastUpdated) {
        return res.status(400).json({ ok: false, error: "No valid updates", skipped });
      }

      // Apply cell updates
      if (data.length) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            valueInputOption: "RAW",
            data,
          },
        });
      }

      // Append meta.lastUpdated if missing
      if (needsAppendLastUpdated) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${SETTINGS_SHEET_NAME}!A:C`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: {
            values: [["meta", "lastUpdated", nowIso]],
          },
        });
        applied.push({ Group: "meta", Key: "lastUpdated", Value: nowIso });
      }

      return res.status(200).json({ ok: true, email, applied, skipped, lastUpdated: nowIso });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    const status = err?.statusCode || 401;
    return res.status(status).json({ ok: false, error: err?.message || String(err) });
  }
}
