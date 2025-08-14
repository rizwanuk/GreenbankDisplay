// src/hooks/usePrayerTimes.js
import useSheetWithCache from "./useSheetWithCache";
import { tab, lastUpdatedMeta } from "../constants/sheets";

const PRAYERS_DATA_URL = tab("PrayerTimes");
const PRAYERS_META_URL = lastUpdatedMeta();

export default function usePrayerTimes() {
  return useSheetWithCache({
    dataUrl: PRAYERS_DATA_URL,
    metaUrl: PRAYERS_META_URL, // set to null if you don't want meta polling
    cacheKey: "cachedPrayerTimes",
    checkIntervalMs: 2 * 60 * 1000,
  });
}
