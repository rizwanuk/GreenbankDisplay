import { useEffect, useState } from "react";

const SHEET_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings";
const CACHE_KEY = "cachedSettings";
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

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
    const fetchAndCache = async () => {
      try {
        const res = await fetch(SHEET_URL);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setSettings(data);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: new Date().toISOString() })
          );
        } else {
          console.warn("Fetched settings are empty or invalid. Keeping cached version.");
        }
      } catch (error) {
        console.error("⛔ Failed to fetch Settings. Using cache if available.");
      }
    };

    fetchAndCache(); // initial
    const interval = setInterval(fetchAndCache, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return settings;
}
