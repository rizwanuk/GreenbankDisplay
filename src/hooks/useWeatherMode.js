import { useEffect, useMemo } from "react";
import useUiSetting from "./useUiSetting";

/** Returns [mode, setMode] where mode ∈ 'off'|'now'|'3h'|'today'
 *  Default comes from sheet: weather.mode → weatherCard.mode (with 'daily' → 'today')
 *  Local override saved in localStorage('ui.weatherMode')
 */
export default function useWeatherMode(settingsMap, fallback = "off") {
  const raw = (settingsMap?.["weather.mode"] || settingsMap?.["weatherCard.mode"] || "").toLowerCase().trim();
  const fromSheet = raw === "daily" ? "today" : raw;
  const sheetDefault = useMemo(
    () => (["off","now","3h","today"].includes(fromSheet) ? fromSheet : fallback),
    [fromSheet, fallback]
  );

  const [mode, setMode] = useUiSetting("ui.weatherMode", sheetDefault);

  // If no existing override, follow sheet default
  useEffect(() => {
    const existing = localStorage.getItem("ui.weatherMode");
    if (!existing && mode !== sheetDefault) setMode(sheetDefault);
  }, [sheetDefault]); // eslint-disable-line

  return [mode, setMode];
}
