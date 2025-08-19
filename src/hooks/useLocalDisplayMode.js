// src/hooks/useLocalDisplayMode.js
import { useEffect, useState } from "react";

const STORAGE_KEY = "displayMode";

/** Display mode options shown in the menu */
export const DISPLAY_MODE_PRESETS = [
  { label: "1080p (16:9)", value: "1080p" },
  { label: "1440p (16:9)", value: "1440p" },
  { label: "4K (2160p, 16:9)", value: "4k" },
  { label: "720p (16:9)", value: "720p" },
  { label: "UltraWide 2560×1080", value: "uw-2560" },
  { label: "Compact", value: "compact" },
  { label: "Large", value: "large" },
];

/**
 * Stores/loads display mode locally (per device) using localStorage.
 * Returns [mode, setMode].
 */
export default function useLocalDisplayMode(defaultValue = "1080p") {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore write errors (private mode, etc.)
    }
  }, [mode]);

  return [mode, setMode];
}
