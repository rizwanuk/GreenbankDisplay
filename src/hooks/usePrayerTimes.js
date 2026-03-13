import useSheetWithCache from "./useSheetWithCache";

export default function usePrayerTimes() {
  return useSheetWithCache({
    dataUrl: "/api/prayertimes",
    metaUrl: "/api/prayertimes-version",
    cacheKey: "cachedPrayerTimes",
    checkIntervalMs: 5 * 60 * 1000,
  });
}
