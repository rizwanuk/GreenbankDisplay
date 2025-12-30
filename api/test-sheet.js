import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!email || !keyRaw || !sheetId) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing env vars: GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEET_ID",
      });
    }

    // Vercel often stores newlines as \n inside env vars
    const privateKey = keyRaw.replace(/\\n/g, "\n");

    const auth = new google.auth.JWT(
      email,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    const sheets = google.sheets({ version: "v4", auth });

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
