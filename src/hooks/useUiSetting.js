import { useState, useEffect } from "react";

/**
 * A hook that reads/writes a single UI setting to localStorage.
 * Returns [value, setter] like useState.
 */
export default function useUiSetting(key, defaultValue = "") {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }, [key, value]);

  return [value, setValue];
}
