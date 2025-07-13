import { useEffect, useState } from "react";

const SHEET_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings";
const META_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings?group=meta&key=lastUpdated";
const CACHE_KEY = "cachedSettings";
const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function useSettings() {
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      setSettings(data);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(SHEET_URL);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSettings(data);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: new Date().toISOString() })
          );
        }
      } catch (error) {
        console.error("⛔ Failed to fetch settings.");
      }
    };

    const checkIfUpdated = async () => {
      try {
        const res = await fetch(META_URL);
        const meta = await res.json();
        const remoteTimestamp = meta?.[0]?.Value;

        const cached = localStorage.getItem(CACHE_KEY);
        const localTimestamp = cached ? JSON.parse(cached).timestamp : null;

        if (!localTimestamp || new Date(remoteTimestamp) > new Date(localTimestamp)) {
          fetchSettings();
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch lastUpdated meta for settings.");
      }
    };

    checkIfUpdated(); // initial
    const interval = setInterval(checkIfUpdated, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return settings;
}
