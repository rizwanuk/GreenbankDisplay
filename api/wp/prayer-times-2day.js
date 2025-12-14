// api/wp/prayer-times-2day.js
export const config = { runtime: "nodejs" };

// READ-ONLY ENDPOINT FOR WORDPRESS (ADDITIVE - does not affect existing screens)
import { tab } from "../../src/constants/sheets";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const url = tab("PrayerTimes");

    // ✅ Use built-in fetch (no node-fetch dependency)
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: "Upstream fetch failed", status: response.status });
      return;
    }

    const rows = await response.json();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const matchRow = (d) =>
      rows.find(
        (r) =>
          parseInt(r.Day, 10) === d.getDate() &&
          parseInt(r.Month, 10) === d.getMonth() + 1
      );

    const todayRow = matchRow(today);
    const tomorrowRow = matchRow(tomorrow);

    // Cache at the edge (safe, reduces pressure on opensheet)
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    res.status(200).json({
      today: todayRow || null,
      tomorrow: tomorrowRow || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({
      error: "Function crashed",
      details: String(e?.message || e),
    });
  }
}
