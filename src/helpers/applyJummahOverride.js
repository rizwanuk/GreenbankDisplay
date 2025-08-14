// src/helpers/applyJummahOverride.js
import moment from "moment-hijri";
import { getJummahTime } from "../hooks/usePrayerHelpers";

/**
 * If a Dhuhr item falls on a Friday (based on the item's own date),
 * rename it to Jum'ah, set lookupKey='jummah', and swap in the Jum'ah jama'ah time.
 *
 * @param {Object} item - { name, lookupKey?, start: moment, jamaah? }
 * @param {Object} settingsMap - settings map used by getJummahTime
 * @returns {Object} shallow-copied item with overrides when applicable
 */
export default function applyJummahOverride(item, settingsMap) {
  if (!item?.start || !moment.isMoment(item.start)) return item;

  const isFridayForThisPrayer = item.start.format("dddd") === "Friday";
  const key = (item.lookupKey || item.name || "").toLowerCase();

  if (isFridayForThisPrayer && key === "dhuhr") {
    const updated = { ...item, name: "Jummah", lookupKey: "jummah" };
    const j = getJummahTime(settingsMap, item.start); // pass the prayer's own date
    if (j?.isValid?.()) updated.jamaah = j;
    return updated;
  }

  return item;
}
