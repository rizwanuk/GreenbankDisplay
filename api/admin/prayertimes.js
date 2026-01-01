// api/admin/prayertimes.js
import { google } from "googleapis";

/**
 * Verifies a Google ID token from the browser (Google Sign-In).
 */
async function verifyGoogleToken(authHeader) {
  const token = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("Missing bearer token");

  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  if (!clientId) throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID");

  const client = new google.auth.OAuth2(clientId);

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Invalid token payload");

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || "",
  };
}

function normalizePrivateKey(keyRaw) {
  return String(keyRaw || "").replace(/\\n/g, "\n");
}

function getGoogleAuth() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const privateKey = normalizePrivateKey(keyRaw);

  if (!email) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL");
  if (!privateKey) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const SETTINGS_SHEET_NAME = process.env.GOOGLE_SETTINGS_SHEET_NAME || "Settings";
const PRAYERTIMES_SHEET_NAME =
  process.env.GOOGLE_PRAYERTIMES_SHEET_NAME || "PrayerTimes";

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

async function readSheetValues(sheets, sheetId, sheetName) {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:Z`,
    majorDimension: "ROWS",
  });
  return resp.data.values || [];
}

/**
 * Reads Settings sheet and determines role from "adminUsers" group.
 */
async function getUserRole(sheets, sheetId, email) {
  const rows = await readSheetValues(sheets, sheetId, SETTINGS_SHEET_NAME);

  for (let i = 0; i < rows.length; i++) {
    const [group, key, value] = rows[i] || [];
    if (norm(group) === "adminusers" && norm(key) === norm(email)) {
      return norm(value) || "";
    }
  }
  return "";
}

function colToA1(c1) {
  // c1 is 1-based column index
  let n = Number(c1);
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function isValidTimeHHMM(v) {
  const s = String(v ?? "").trim();
  if (s === "") return true; // allow clearing
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function normalizeTime(v) {
  const s = String(v ?? "").trim();
  if (s === "") return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return s;
  const hh = String(Number(m[1])).padStart(2, "0");
  return `${hh}:${m[2]}`;
}

/**
 * ✅ FIXED: Works with dev-api.mjs (req.body is a string),
 * and with Vercel (req.body is already an object).
 */
async function readJsonBody(req) {
  // Vercel: already parsed
  if (req.body && typeof req.body === "object") return req.body;

  // dev-api.mjs: req.body is a raw string
  if (typeof req.body === "string") {
    const raw = req.body.trim();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  // fallback (only if stream not already consumed)
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default async function handler(req, res) {
  try {
    const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();
    if (!sheetId) throw new Error("Missing GOOGLE_SHEET_ID");

    // Auth
    const user = await verifyGoogleToken(req.headers.authorization);

    // Google Sheets client
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });

    // Role check
    const role = await getUserRole(sheets, sheetId, user.email);
    if (!role) {
      return res.status(403).json({ ok: false, error: "Not allowed" });
    }

    // GET: Read PrayerTimes
    if (req.method === "GET") {
      const rows = await readSheetValues(sheets, sheetId, PRAYERTIMES_SHEET_NAME);
      return res.status(200).json({
        ok: true,
        sheet: PRAYERTIMES_SHEET_NAME,
        rows,
        role,
        email: user.email,
      });
    }

    // POST: Write patches
    if (req.method === "POST") {
      if (role !== "admin" && role !== "editor") {
        return res.status(403).json({ ok: false, error: "Read-only access" });
      }

      const body = await readJsonBody(req);
      const sheetName = String(body?.sheet || PRAYERTIMES_SHEET_NAME).trim();
      const patches = Array.isArray(body?.patches) ? body.patches : [];

      if (sheetName !== PRAYERTIMES_SHEET_NAME) {
        return res.status(400).json({ ok: false, error: "Invalid sheet" });
      }

      if (!patches.length) {
        return res.status(400).json({ ok: false, error: "No patches provided" });
      }

      if (patches.length > 1000) {
        return res.status(400).json({ ok: false, error: "Too many changes in one save" });
      }

      const data = patches.map((p) => {
        const r = Number(p?.r); // 1-based row
        const c = Number(p?.c); // 1-based col
        const value = normalizeTime(p?.value);

        if (!Number.isInteger(r) || r < 2) {
          throw new Error(`Invalid row in patch: ${JSON.stringify(p)}`);
        }
        if (!Number.isInteger(c) || c < 1) {
          throw new Error(`Invalid col in patch: ${JSON.stringify(p)}`);
        }
        if (!isValidTimeHHMM(value)) {
          throw new Error(`Invalid time "${p?.value}" at r${r} c${c}. Use HH:MM`);
        }

        const a1 = `${colToA1(c)}${r}`;
        return {
          range: `${sheetName}!${a1}`,
          values: [[value]],
        };
      });

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data,
        },
      });

      return res.status(200).json({
        ok: true,
        written: data.length,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || String(e),
    });
  }
}
