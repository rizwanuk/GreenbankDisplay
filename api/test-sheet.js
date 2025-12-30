import { google } from "googleapis";

function normalizePrivateKey(keyRaw) {
  if (!keyRaw) return "";

  let k = String(keyRaw).trim();

  // Case 1: stored with escaped newlines
  if (k.includes("\\n")) return k.replace(/\\n/g, "\n");

  // Case 2: already has real newlines
  if (k.includes("\n")) return k;

  // Case 3: single-line PEM
  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";

  // Remove header/footer and all whitespace
  k = k.replace(header, "").replace(footer, "").replace(/\s+/g, "");

  // Wrap the body at 64 chars per line (standard PEM formatting)
  const wrapped = k.match(/.{1,64}/g)?.join("\n") || k;

  return `${header}\n${wrapped}\n${footer}\n`;
}

export default async function handler(req, res) {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const sheetId = (process.env.GOOGLE_SHEET_ID || "").trim();

  const privateKey = normalizePrivateKey(keyRaw);

  // Safe diagnostics only (no secrets)
  const diag = {
    version: "v3-googleauth-credentials",
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
    normalizedKeyHasRealNewlines: privateKey.includes("\n"),
    normalizedKeyStartsCorrectly: privateKey.startsWith("-----BEGIN PRIVATE KEY-----"),
    runtime: process.env.VERCEL ? "vercel" : "local",
  };

  try {
    if (!email || !keyRaw || !sheetId) {
      return res.status(500).json({ ok: false, error: "Missing env vars", diag });
    }

    // ✅ Use GoogleAuth with explicit credentials (more robust than JWT constructor here)
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();

    // Force token creation to confirm auth works
    const token = await client.getAccessToken();
    diag.gotAccessToken = !!token?.token;

    const sheets = google.sheets({ version: "v4", auth: client });

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
