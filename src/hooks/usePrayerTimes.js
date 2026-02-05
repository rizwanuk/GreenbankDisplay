import useSheetWithCache from "./useSheetWithCache";

const PRAYERS_DATA_URL = "/data/prayer-times.json";
const PRAYERS_META_URL = "/data/version.json"; // ✅ version file drives refresh

export default function usePrayerTimes() {
  return useSheetWithCache({
    dataUrl: PRAYERS_DATA_URL,
    metaUrl: PRAYERS_META_URL,
    cacheKey: "cachedPrayerTimes",
    checkIntervalMs: 5 * 60 * 1000, // keep as 5 mins for now
  });
}
