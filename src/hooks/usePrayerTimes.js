import { useEffect, useState } from "react";

const TIMETABLE_URL =
  "https://opensheet.elk.sh/1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g/PrayerTimes";
const CACHE_KEY = "cachedPrayerTimes";
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function usePrayerTimes() {
  const [timetable, setTimetable] = useState([]);

  // ✅ Load from cache immediately
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      setTimetable(data);
    }
  }, []);

  // ✅ Try to fetch and update regularly
  useEffect(() => {
    const fetchAndCache = async () => {
      try {
        const res = await fetch(TIMETABLE_URL);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          setTimetable(data);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: new Date().toISOString() })
          );
        } else {
          console.warn("Fetched data is empty or invalid. Keeping cached version.");
        }
      } catch (error) {
        console.error("⛔ Failed to fetch PrayerTimes. Using cache if available.");
      }
    };

    fetchAndCache(); // initial
    const interval = setInterval(fetchAndCache, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return timetable;
}
