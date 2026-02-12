import useSheetWithCache from "./useSheetWithCache";
import { tab, lastUpdatedMeta } from "../constants/sheets";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export default function useSettings() {
  // ✅ Direct OpenSheet URLs (no Vercel invocations)
  const SETTINGS_URL = tab("settings");
  const META_URL = lastUpdatedMeta(); // settings tab contains meta/lastUpdated row

  return useSheetWithCache({
    dataUrl: SETTINGS_URL,
    metaUrl: META_URL,
    cacheKey: "cachedSettings",

    // ✅ localhost: very fast checks
    // ✅ production: still fast enough to feel "immediate" but not noisy
    checkIntervalMs: isLocalhost ? 2000 : 30000,

    // ✅ instant cross-tab sync + admin save invalidation
    invalidateKey: "gbm_settings_invalidate",
    channelName: "gbm_settings_channel",
  });
}
