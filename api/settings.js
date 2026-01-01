// api/settings.js
export default async function handler(req, res) {
  // Optional: only allow GET
  if (req.method && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const SHEET_ID =
      process.env.SHEET_ID || "1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g";

    const url = `https://opensheet.elk.sh/${SHEET_ID}/settings`;

    const r = await fetch(url, {
      headers: { "Cache-Control": "no-store" },
    });

    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({
        ok: false,
        error: "Failed to fetch OpenSheet settings",
        status: r.status,
        body: body.slice(0, 300),
      });
    }

    const rows = await r.json(); // OpenSheet returns an array

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );

    return res.status(200).json({ ok: true, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
