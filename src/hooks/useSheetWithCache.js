// src/hooks/useSheetWithCache.js
import { useEffect, useState } from "react";

/**
 * Generic "Google Sheet via API + localStorage cache + optional meta polling" hook.
 *
 * Behavior:
 * - Boots from localStorage immediately if present.
 * - Always fetches fresh data once on mount.
 * - Optionally polls a meta endpoint; if "lastUpdated" changes, it refetches data.
 *
 * Required params:
 * - dataUrl: url that returns the sheet data (array of rows)
 * - cacheKey: localStorage key (e.g., "cachedSettings" / "cachedPrayerTimes")
 *
 * Optional params:
 * - metaUrl: url that returns a small meta object/array with a last-updated marker
 * - checkIntervalMs: how often to check meta
 *
 * IMPORTANT:
 * This hook RETURNS AN ARRAY (backwards compatible).
 * We attach refreshStatus onto the returned array as a property.
 */
export default function useSheetWithCache({
  dataUrl,
  cacheKey,
  metaUrl = null,
  checkIntervalMs = 120000,
}) {
  const [data, setData] = useState([]);

  // ✅ NEW: refresh status (for footer indicator)
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [nextCheckAt, setNextCheckAt] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Track browser online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1) Bootstrap from cache (fast paint)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.data)) {
          setData(parsed.data);
        }
      }
    } catch (e) {
      // non-fatal
      console.warn(`Failed to read cache for ${cacheKey}`, e);
    }
  }, [cacheKey]);

  // Helper: store to cache
  const putCache = (rows, timestamp) => {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: rows,
          timestamp: timestamp || new Date().toISOString(),
        })
      );
    } catch (e) {
      // non-fatal
      console.warn(`Failed to write cache for ${cacheKey}`, e);
    }
  };

  // 2) Fetch fresh once on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(dataUrl, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (Array.isArray(json)) {
          setData(json);
          putCache(json);
        }
      } catch (e) {
        console.warn(`Initial fetch failed for ${cacheKey}`, e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dataUrl, cacheKey]);

  // 3) Poll meta for updates (optional)
  useEffect(() => {
    if (!metaUrl) return;

    let alive = true;

    const readRemoteStamp = (meta) => {
      // Try a few common shapes:
      // - [{ Value: "ISO" }] or [{ value: "ISO" }]
      // - { lastupdated: "ISO" } / { lastUpdated: "ISO" }
      if (Array.isArray(meta) && meta.length) {
        return meta[0]?.Value || meta[0]?.value || null;
      }
      return meta?.lastupdated || meta?.lastUpdated || null;
    };

    const check = async () => {
      const now = new Date();
      setLastCheckedAt(now);
      setNextCheckAt(new Date(now.getTime() + checkIntervalMs));

      // If offline, don't attempt remote fetch (but keep times updated)
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      try {
        const res = await fetch(metaUrl, { cache: "no-store" });
        const meta = await res.json();
        if (!alive) return;

        const remoteStamp = readRemoteStamp(meta);

        const cached = localStorage.getItem(cacheKey);
        const localStamp = cached ? JSON.parse(cached).timestamp : null;

        if (remoteStamp && remoteStamp !== localStamp) {
          // refetch data
          const rr = await fetch(dataUrl, { cache: "no-store" });
          const rows = await rr.json();
          if (!alive) return;
          if (Array.isArray(rows)) {
            setData(rows);
            putCache(rows, remoteStamp);
          }
        }
      } catch (e) {
        // non-fatal
      }
    };

    const id = setInterval(check, checkIntervalMs);
    // Run once on mount too
    check();

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [metaUrl, dataUrl, cacheKey, checkIntervalMs]);

  // ✅ RETURN AN ARRAY (backwards compatible) + attach status as a property
  const out = Array.isArray(data) ? data : [];
  const outArr = [...out];

  return Object.assign(outArr, {
    refreshStatus: {
      lastCheckedAt,
      nextCheckAt,
      isOnline,
      intervalMs: checkIntervalMs,
    },
  });
}
