import { useCallback, useEffect, useRef, useState } from "react";

export default function useSheetWithCache({
  dataUrl,
  cacheKey,
  metaUrl = null,
  checkIntervalMs = 120000,
  invalidateKey = null,
  channelName = null,
}) {
  const [data, setData] = useState([]);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [nextCheckAt, setNextCheckAt] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const refreshInFlightRef = useRef(false);

  // -------------------------
  // Online / Offline handling
  // -------------------------
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // -------------------------
  // Cache helpers
  // -------------------------
  const putCache = useCallback(
    (rows, timestamp) => {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: rows,
            timestamp: timestamp || new Date().toISOString(),
          })
        );
      } catch {}
    },
    [cacheKey]
  );

  const getCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [cacheKey]);

  const readRemoteStamp = (meta) => {
    if (Array.isArray(meta) && meta.length) {
      const metaRow =
        meta.find((r) => r?.Group === "meta" && r?.Key === "lastUpdated") ||
        null;
      if (metaRow?.Value) return metaRow.Value;

      return meta[0]?.Value || meta[0]?.value || null;
    }
    return meta?.lastupdated || meta?.lastUpdated || null;
  };

  // -------------------------
  // Core refresh
  // -------------------------
  const refreshNow = useCallback(
    async ({ reason = "manual" } = {}) => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;

      try {
        if (!navigator.onLine) return;

        const res = await fetch(dataUrl, { cache: "no-store" });
        const json = await res.json();

        const rows = Array.isArray(json)
          ? json
          : Array.isArray(json?.rows)
          ? json.rows
          : null;

        if (Array.isArray(rows)) {
          setData(rows);
          putCache(rows);

          if (channelName && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel(channelName);
            bc.postMessage({ type: "cacheUpdated", cacheKey, reason });
            bc.close();
          }
        }
      } catch (e) {
        console.warn("Refresh failed:", e);
      } finally {
        refreshInFlightRef.current = false;
      }
    },
    [dataUrl, cacheKey, putCache, channelName]
  );

  // -------------------------
  // Boot from cache
  // -------------------------
  useEffect(() => {
    const cached = getCache();
    if (cached?.data) {
      setData(cached.data);
    }
  }, [getCache]);

  // -------------------------
  // Initial fetch
  // -------------------------
  useEffect(() => {
    refreshNow({ reason: "mount" });
  }, [refreshNow]);

  // -------------------------
  // Poll meta for changes
  // -------------------------
  useEffect(() => {
    if (!metaUrl) return;

    let alive = true;

    const check = async () => {
      const now = new Date();
      setLastCheckedAt(now);
      setNextCheckAt(new Date(now.getTime() + checkIntervalMs));

      if (!navigator.onLine) return;

      try {
        const res = await fetch(metaUrl, { cache: "no-store" });
        const meta = await res.json();
        if (!alive) return;

        const remoteStamp = readRemoteStamp(meta);
        const cached = getCache();
        const localStamp = cached?.timestamp || null;

        if (remoteStamp && remoteStamp !== localStamp) {
          const rr = await fetch(dataUrl, { cache: "no-store" });
          const dj = await rr.json();
          const rows = Array.isArray(dj)
            ? dj
            : Array.isArray(dj?.rows)
            ? dj.rows
            : null;

          if (!alive) return;
          if (Array.isArray(rows)) {
            setData(rows);
            putCache(rows, remoteStamp);

            if (channelName && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel(channelName);
              bc.postMessage({ type: "metaChanged", cacheKey });
              bc.close();
            }
          }
        }
      } catch {}
    };

    const id = setInterval(check, checkIntervalMs);
    check();

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [metaUrl, dataUrl, cacheKey, checkIntervalMs, putCache, channelName, getCache]);

  // -------------------------
  // Storage sync
  // -------------------------
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === cacheKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.data) setData(parsed.data);
        } catch {}
      }

      if (invalidateKey && e.key === invalidateKey) {
        refreshNow({ reason: "invalidate" });
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cacheKey, invalidateKey, refreshNow]);

  // -------------------------
  // BroadcastChannel sync
  // -------------------------
  useEffect(() => {
    if (!channelName || !("BroadcastChannel" in window)) return;

    const bc = new BroadcastChannel(channelName);

    const onMsg = (e) => {
      if (
        e?.data?.type === "cacheUpdated" ||
        e?.data?.type === "metaChanged" ||
        e?.data?.type === "invalidate"
      ) {
        const cached = getCache();
        if (cached?.data) {
          setData(cached.data);
        } else {
          refreshNow({ reason: "broadcast" });
        }
      }
    };

    bc.addEventListener("message", onMsg);

    return () => {
      bc.removeEventListener("message", onMsg);
      bc.close();
    };
  }, [channelName, getCache, refreshNow]);

  const out = Array.isArray(data) ? data : [];
  const outArr = [...out];

  return Object.assign(outArr, {
    refreshStatus: {
      lastCheckedAt,
      nextCheckAt,
      isOnline,
      intervalMs: checkIntervalMs,
    },
    refreshNow,
  });
}
