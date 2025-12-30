import { google } from "googleapis";

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

export default async function handler(req, res) {
  try {
    const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
    const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();

    if (!email || !keyRaw || !sheetId) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEET_ID",
      });
    }

    const privateKey = normalizePrivateKey(keyRaw);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1:C5",
    });

    return res.status(200).json({
      ok: true,
      rows: result.data.values || [],
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
    });
  }
}
