import useSheetWithCache from "./useSheetWithCache";
import { tab, lastUpdatedMeta } from "../constants/sheets";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export default function useSettings() {
  const SETTINGS_URL = tab("settings");
  const META_URL = lastUpdatedMeta();

  return useSheetWithCache({
    dataUrl: SETTINGS_URL,
    metaUrl: META_URL,
    cacheKey: "cachedSettings",

    // ⚡ Fast locally
    // 🌍 Sensible polling in production (no Vercel impact)
    checkIntervalMs: isLocalhost ? 2000 : 30000,

    // 🔔 Admin save + cross-tab refresh
    invalidateKey: "gbm_settings_invalidate",
    channelName: "gbm_settings_channel",
  });
}
