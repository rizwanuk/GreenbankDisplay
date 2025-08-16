import { useEffect, useMemo } from "react";
import useUiSetting from "./useUiSetting";

/** Returns [mode, setMode] where mode ∈ 'off'|'now'|'3h'|'today'|'24h'
 *  Default comes from sheet: weather.mode → weatherCard.mode
 *  Sheet synonyms:
 *    - 'daily' → 'today'
 *    - 'next24h' → '24h'
 */
export default function useWeatherMode(settingsMap, fallback = "off") {
  const rawSheet =
    (settingsMap?.["weather.mode"] || settingsMap?.["weatherCard.mode"] || "")
      .toLowerCase()
      .trim();

  // normalise common sheet aliases
  const fromSheet =
    rawSheet === "daily"
      ? "today"
      : rawSheet === "next24h"
      ? "24h"
      : rawSheet;

  const allowed = ["off", "now", "3h", "today", "24h"];
  const sheetDefault = useMemo(
    () => (allowed.includes(fromSheet) ? fromSheet : fallback),
    [fromSheet, fallback]
  );

  const [mode, setMode] = useUiSetting("ui.weatherMode", sheetDefault);

  // If no existing local override, follow sheet default
  useEffect(() => {
    const existing = localStorage.getItem("ui.weatherMode");
    if (!existing && mode !== sheetDefault) setMode(sheetDefault);
  }, [sheetDefault]); // eslint-disable-line

  return [mode, setMode];
}
