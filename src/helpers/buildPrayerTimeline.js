// src/helpers/buildPrayerTimeline.js
import { PRAYERS } from "../constants/prayers";

/**
 * Build a flat timeline the rest of the app expects.
 * We keep identical shapes/keys to avoid any behaviour change:
 *  - { key, adhanKey, jamaahKey, source }
 *  - today entries come from PRAYERS
 *  - we still append the special "fajr_tomorrow" row at the end
 */
export function buildPrayerTimeline({ today, yesterday, tomorrow, settingsMap }) {
  // Map the canonical PRAYERS list to today's entries
  const todayEntries = PRAYERS.map(p => ({
    key: p.key,
    adhanKey: p.adhanKey,
    // keep property name "jamaahKey" to match existing consumers
    jamaahKey: p.iqamahKey,
    source: "today",
  }));

  // Preserve the extra "fajr_tomorrow" row exactly as before
  const fajrTomorrow = {
    key: "fajr_tomorrow",
    adhanKey: "Fajr Adhan",
    jamaahKey: "Fajr Iqamah",
    source: "tomorrow",
  };

  return [...todayEntries, fajrTomorrow];
}
