// src/hooks/useRemoteDeviceConfig.js
import { useEffect, useRef, useState } from "react";

export default function useRemoteDeviceConfig(deviceCode, _apiUrl, pollMs = 15000) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!deviceCode) return;

    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/device-config?code=${encodeURIComponent(deviceCode)}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setCfg(data.data || null);
          setError(null);
        } else {
          setError(data.error || "Remote config error");
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };

    fetchOnce();
    timerRef.current = setInterval(fetchOnce, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [deviceCode, pollMs]);

  return { cfg, error };
}
