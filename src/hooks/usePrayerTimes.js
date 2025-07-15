import { useEffect, useState } from "react";

const SHEET_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/PrayerTimes";
const META_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/settings?group=meta&key=lastUpdated";
const CACHE_KEY = "cachedPrayerTimes";
const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function usePrayerTimes() {
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      setTimetable(data);
    }
  }, []);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const res = await fetch(SHEET_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
          setTimetable(data);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: new Date().toISOString() })
          );
        }
      } catch (error) {
        console.error("⛔ Failed to fetch prayer times.");
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
          fetchPrayerTimes();
        }
      } catch (error) {
        console.warn("⚠️ Failed to fetch lastUpdated meta for prayer times.");
      }
    };

    checkIfUpdated(); // initial
    const interval = setInterval(checkIfUpdated, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return timetable;
}
