import { google } from "googleapis";

export default async function handler(req, res) {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();

  // Safe diagnostics only (no secrets)
  const diag = {
    hasEmail: !!email,
    email: email ? email : "(missing)",
    hasSheetId: !!sheetId,
    sheetIdLen: sheetId.length,
    hasPrivateKey: !!keyRaw,
    privateKeyLen: keyRaw.length,
    privateKeyHasBegin: keyRaw.includes("BEGIN PRIVATE KEY"),
    privateKeyHasEnd: keyRaw.includes("END PRIVATE KEY"),
    privateKeyHasEscapedNewlines: keyRaw.includes("\\n"),
    privateKeyHasRealNewlines: keyRaw.includes("\n"),
    runtime: process.env.VERCEL ? "vercel" : "local",
  };

  try {
    if (!email || !keyRaw || !sheetId) {
      return res.status(500).json({ ok: false, error: "Missing env vars", diag });
    }

    // Handle either escaped newlines (\n) or real newlines
    const privateKey = keyRaw.includes("\\n") ? keyRaw.replace(/\\n/g, "\n") : keyRaw;

    const auth = new google.auth.JWT(
      email,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );

    // Force token creation so we can see if auth is working
    const token = await auth.getAccessToken();
    diag.gotAccessToken = !!token?.token;

    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1:C5",
    });

    return res.status(200).json({
      ok: true,
      diag,
      rows: result.data.values || [],
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || String(err),
      diag,
    });
  }
}
