// api/wp/prayer-times-2day.js
// READ-ONLY, STANDALONE SERVERLESS FUNCTION
// No React, no RSC, no app imports

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // 🔒 Inline OpenSheet URL (prevents import-time crashes)
    const PRAYER_TIMES_URL =
      "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/PrayerTimes";

    const response = await fetch(PRAYER_TIMES_URL);

    if (!response.ok) {
      res.status(502).json({
        error: "Upstream fetch failed",
        status: response.status,
      });
      return;
    }

    const rows = await response.json();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const matchRow = (d) =>
      rows.find(
        (r) =>
          Number(r.Day) === d.getDate() &&
          Number(r.Month) === d.getMonth() + 1
      );

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    res.status(200).json({
      today: matchRow(today) || null,
      tomorrow: matchRow(tomorrow) || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      error: "Serverless function error",
      message: String(err),
    });
  }
}
