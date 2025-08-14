// src/hooks/useNow.js
import { useEffect, useState } from "react";
import moment from "moment";

/**
 * Returns a moment() that updates on an interval (default 1s)
 * and refreshes immediately when the tab becomes visible again.
 */
export default function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => moment());

  useEffect(() => {
    const tick = () => setNow(moment());

    const id = setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);

  return now;
}
