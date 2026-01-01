import useSheetWithCache from "./useSheetWithCache";

// Same sheet you already use for settings
const SETTINGS_DATA_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings";

// IMPORTANT:
// OpenSheet does NOT support query filtering.
// Use the full settings tab for cache invalidation as well.
const SETTINGS_META_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings";

export default function useSettings() {
  return useSheetWithCache({
    dataUrl: SETTINGS_DATA_URL,
    metaUrl: SETTINGS_META_URL,
    cacheKey: "cachedSettings",
    checkIntervalMs: 2 * 60 * 1000, // 2 minutes
  });
}
