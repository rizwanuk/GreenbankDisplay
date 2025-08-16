import { useEffect, useState } from "react";

/** LocalStorage-backed state hook, reusable across screens */
export default function useUiSetting(key, defaultValue = "") {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v !== null ? v : defaultValue; }
    catch { return defaultValue; }
  });

  useEffect(() => {
    try {
      if (value === undefined || value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
