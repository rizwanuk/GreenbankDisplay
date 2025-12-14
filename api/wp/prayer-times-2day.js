import fetch from "node-fetch";
import { tab } from "../../src/constants/sheets";

// READ-ONLY ENDPOINT FOR WORDPRESS (ADDITIVE - does not affect existing screens)
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const url = tab("PrayerTimes");
    const response = await fetch(url);
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

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json({
      today: todayRow || null,
      tomorrow: tomorrowRow || null,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: "Unable to load prayer times" });
  }
}
