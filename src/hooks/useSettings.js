import useSheetWithCache from "./useSheetWithCache";

const SETTINGS_DATA_URL = "/data/settings.json";
const SETTINGS_META_URL = "/data/version.json"; // ✅ version file drives refresh

export default function useSettings() {
  return useSheetWithCache({
    dataUrl: SETTINGS_DATA_URL,
    metaUrl: SETTINGS_META_URL,
    cacheKey: "cachedSettings",
    checkIntervalMs: 5 * 60 * 1000, // keep as 5 mins for now
  });
}
