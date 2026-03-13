import useSheetWithCache from "./useSheetWithCache";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export default function useSettings() {
  return useSheetWithCache({
    dataUrl: "/api/settings",
    metaUrl: "/api/settings",
    cacheKey: "cachedSettings",
    checkIntervalMs: isLocalhost ? 2000 : 5000,
    invalidateKey: "gbm_settings_invalidate",
    channelName: "gbm_settings_channel",
  });
}
