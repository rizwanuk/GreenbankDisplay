// src/hooks/useMobileTheme.js
import { useMemo, useState, useEffect } from "react";
import { buildMobileThemeMap, getMobileThemeNames, getMobileTheme } from "../theme/mobileTheme";

const LS_KEY = "localThemeMobile"; // local override per your requirement

export default function useMobileTheme(settingsRows = [], sheetDefaultName = "") {
  const themeNames = useMemo(() => getMobileThemeNames(settingsRows), [settingsRows]);
  const defaultFromSheet = (sheetDefaultName || "").trim(); // e.g. settings.toggles.themeMobile
  const defaultName = defaultFromSheet || themeNames[0] || "Theme_1";

  const [activeName, setActiveName] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || defaultName;
    } catch {
      return defaultName;
    }
  });

  useEffect(() => {
    // If the sheet changes and our active theme disappears, fall back
    if (themeNames.length && !themeNames.includes(activeName)) {
      setActiveName(defaultName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(themeNames)]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, activeName);
    } catch {}
  }, [activeName]);

  const theme = useMemo(() => getMobileTheme(settingsRows, activeName), [settingsRows, activeName]);

  return {
    themeNames,     // ["Theme_1","Theme_2","Theme_4",...]
    activeName,     // "Theme_4"
    setActiveName,  // (name) => void
    theme,          // structured theme object (sections/keys → Tailwind classes)
    themeMap: useMemo(() => buildMobileThemeMap(settingsRows), [settingsRows]),
  };
}
