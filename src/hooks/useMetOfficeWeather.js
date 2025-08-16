// Met Office fetcher with cache, rate-limit handling, fallback, and client-side daily budget
// Uses your existing reverse proxy base: /sitespecific/v0/point
import { useEffect, useMemo, useRef, useState } from "react";

const BASE = "/sitespecific/v0/point";

// Cache TTLs
const TTL_MS = {
  hourly: 10 * 60 * 1000,        // 10 min
  "three-hourly": 20 * 60 * 1000, // 20 min
  daily: 3 * 60 * 60 * 1000,      // 3 hours
};

// -------- persistence keys --------
const LS_PREFIX = "metwx";
const keyForCache = (k) => `${LS_PREFIX}:cache:${k}`;
const keyRateLimit = `${LS_PREFIX}:rateLimitUntil`;
const keyBucket = `${LS_PREFIX}:bucket`;
const keyLastFetchTs = `${LS_PREFIX}:lastFetch`;

// Minimal spacing between calls (protective burst limit)
const MIN_INTERVAL_MS = 1200;

// Default local daily budget if not provided by settings (you can tune this)
const DEFAULT_DAILY_BUDGET = 500;

// In-flight dedupe by URL
const inflight = new Map();

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
function readNumber(key) {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}
function writeNumber(key, n) {
  try {
    localStorage.setItem(key, String(n));
  } catch {}
}

function getCache(cacheKey) {
  return readJSON(keyForCache(cacheKey));
}
function setCache(cacheKey, value) {
  writeJSON(keyForCache(cacheKey), value);
}

function readRateLimitUntil() {
  return readNumber(keyRateLimit) || 0;
}
function writeRateLimitUntil(untilTs) {
  writeNumber(keyRateLimit, untilTs || 0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ----- Client-side daily token bucket -----
function takeToken(dailyBudget) {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const keyDate = `${yyyy}-${mm}-${dd}`;

  let bucket = readJSON(keyBucket);
  if (!bucket || bucket.date !== keyDate) {
    bucket = { date: keyDate, tokens: Number(dailyBudget) || DEFAULT_DAILY_BUDGET };
  }

  if (bucket.tokens <= 0) {
    const e = new Error("Local client budget reached");
    e.name = "ClientBudgetError";
    e.until = new Date(Date.UTC(yyyy, today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0)).getTime(); // next UTC midnight
    throw e;
  }

  bucket.tokens -= 1;
  writeJSON(keyBucket, bucket);
}

async function ensureMinInterval() {
  const last = readNumber(keyLastFetchTs);
  const now = Date.now();
  const delta = now - last;
  if (last && delta < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - delta);
  }
  writeNumber(keyLastFetchTs, Date.now());
}

function buildUrl(kind, lat, lon) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
  });
  return `${BASE}/${kind}?${q.toString()}`;
}

async function fetchOnce(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let payload = null;
  if (!res.ok) {
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const e = new Error(`HTTP ${res.status}`);
    e.status = res.status;
    e.raw = payload;
    throw e;
  }
  return res.json();
}

function parseNextAccessTime(val) {
  // Example: "2025-Aug-17 00:00:00+0000 UTC"
  if (!val) return 0;
  const m = /(\d{4})-(\w+)-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(val);
  if (!m) return 0;
  const [_, y, mon, d, hh, mm, ss] = m;
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[mon.slice(0, 3)] ?? 0;
  const dt = new Date(Date.UTC(Number(y), month, Number(d), Number(hh), Number(mm), Number(ss)));
  return dt.getTime();
}

export default function useMetOfficeWeather({ lat, lon, mode = "3h", dailyBudget = DEFAULT_DAILY_BUDGET }) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
    resolvedKind: null,
  });

  // Map UI mode to preferred product
  const preferredKind = useMemo(() => {
    if (mode === "now") return "hourly";  // not always available → we'll fallback
    if (mode === "24h" || mode === "3h" || mode === "today") return "three-hourly";
    return "three-hourly";
  }, [mode]);

  const urlsToTry = useMemo(() => {
    if (lat == null || lon == null) return [];
    const order = preferredKind === "hourly"
      ? ["hourly", "three-hourly", "daily"]
      : ["three-hourly", "daily"];
    return order.map((kind) => ({ kind, url: buildUrl(kind, lat, lon) }));
  }, [lat, lon, preferredKind]);

  const ttlFor = (kind) => TTL_MS[kind] || 15 * 60 * 1000;

  const refresh = async (force = false) => {
    if (!urlsToTry.length) return;

    // 1) Serve fresh-enough cache immediately
    if (!force) {
      for (const { kind, url } of urlsToTry) {
        const cached = getCache(url);
        const now = Date.now();
        if (cached && now - (cached.savedAt || 0) < ttlFor(kind)) {
          setState({ loading: false, data: cached.data, error: null, resolvedKind: kind });
          // background soft refresh only if > 50% TTL elapsed (non-blocking)
          const age = now - (cached.savedAt || 0);
          if (age > ttlFor(kind) / 2) {
            // fire and forget (not awaited)
            // eslint-disable-next-line no-unused-vars
            (async () => {
              try {
                await doNetwork(kind, url, /*deductToken*/ false, /*allowFallback*/ false);
              } catch {}
            })();
          }
          return;
        }
      }
    }

    // 2) Try network with fallback chain
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // Deduct exactly ONE token for the whole refresh attempt
      takeToken(dailyBudget);

      // Respect min interval between outward calls
      await ensureMinInterval();

      // First attempt preferred; on certain errors, fallback to next
      let lastErr = null;
      for (let i = 0; i < urlsToTry.length; i++) {
        const { kind, url } = urlsToTry[i];

        try {
          const data = await doNetwork(kind, url, /*deductToken*/ false, /*allowFallback*/ false);
          setCache(url, { savedAt: Date.now(), data });
          setState({ loading: false, data, error: null, resolvedKind: kind });
          return;
        } catch (err) {
          lastErr = err;

          // Handle server-side rate limit (429) once and stop
          if (err?.status === 429) {
            const untilTs = parseNextAccessTime(err?.raw?.nextAccessTime) || (Date.now() + 30 * 60 * 1000);
            writeRateLimitUntil(untilTs);
            // Prefer stale cache if any
            for (const { kind: k2, url: u2 } of urlsToTry) {
              const cached = getCache(u2);
              if (cached) {
                setState({
                  loading: false,
                  data: cached.data,
                  error: { type: "rate-limit", until: untilTs, raw: err?.raw },
                  resolvedKind: k2,
                });
                return;
              }
            }
            setState({
              loading: false,
              data: null,
              error: { type: "rate-limit", until: untilTs, raw: err?.raw },
              resolvedKind: null,
            });
            return;
          }

          // If 404 or 501, attempt next kind in chain
          if (err?.status === 404 || err?.status === 501) {
            continue;
          }

          // For any other error, try showing stale cache before giving up
          const cached = getCache(url);
          if (cached) {
            setState({
              loading: false,
              data: cached.data,
              error: { type: "http", status: err?.status || 0, message: err?.message, raw: err?.raw },
              resolvedKind: kind,
            });
            return;
          }
          // Otherwise move to next kind
        }
      }

      // If we get here, all kinds failed
      setState({
        loading: false,
        data: null,
        error: {
          type: lastErr?.name === "ClientBudgetError" ? "client-budget" : "http",
          status: lastErr?.status || 0,
          message: lastErr?.message || "Request failed",
          raw: lastErr?.raw,
        },
        resolvedKind: null,
      });
    } catch (outer) {
      // Could be client-budget or rate-limit gate BEFORE calling network
      if (outer?.name === "ClientBudgetError") {
        // Prefer any cached data
        for (const { kind, url } of urlsToTry) {
          const cached = getCache(url);
          if (cached) {
            setState({
              loading: false,
              data: cached.data,
              error: { type: "client-budget", until: outer.until },
              resolvedKind: kind,
            });
            return;
          }
        }
        setState({
          loading: false,
          data: null,
          error: { type: "client-budget", until: outer.until },
          resolvedKind: null,
        });
        return;
      }

      // Rate-limit gate from previous 429
      if (outer?.name === "RateLimitError") {
        const until = outer.until || readRateLimitUntil();
        for (const { kind, url } of urlsToTry) {
          const cached = getCache(url);
          if (cached) {
            setState({
              loading: false,
              data: cached.data,
              error: { type: "rate-limit", until },
              resolvedKind: kind,
            });
            return;
          }
        }
        setState({
          loading: false,
          data: null,
          error: { type: "rate-limit", until },
          resolvedKind: null,
        });
        return;
      }

      setState({
        loading: false,
        data: null,
        error: { type: "http", status: outer?.status || 0, message: outer?.message || "Request failed", raw: outer?.raw },
        resolvedKind: null,
      });
    }
  };

  // core network with in-flight dedupe and server-rate-limit gate
  async function doNetwork(kind, url) {
    // Server-side rate limit gate
    const until = readRateLimitUntil();
    if (until && Date.now() < until) {
      const e = new Error("Rate limited");
      e.name = "RateLimitError";
      e.until = until;
      throw e;
    }

    // Dedupe
    if (inflight.has(url)) return inflight.get(url);

    const p = (async () => {
      try {
        const json = await fetchOnce(url);
        return json;
      } catch (err) {
        // If provider returns 429 here, capture nextAccessTime
        if (err?.status === 429) {
          const nextTs = parseNextAccessTime(err?.raw?.nextAccessTime) || (Date.now() + 30 * 60 * 1000);
          writeRateLimitUntil(nextTs);
        }
        throw err;
      } finally {
        inflight.delete(url);
      }
    })();

    inflight.set(url, p);
    return p;
  }

  // initial & when inputs change
  const first = useRef(true);
  useEffect(() => {
    if (!urlsToTry.length) return;

    if (first.current) {
      first.current = false;

      // Serve cache synchronously if fresh
      for (const { kind, url } of urlsToTry) {
        const cached = getCache(url);
        const now = Date.now();
        if (cached && now - (cached.savedAt || 0) < ttlFor(kind)) {
          setState({ loading: false, data: cached.data, error: null, resolvedKind: kind });
          // background soft refresh (non-blocking)
          // eslint-disable-next-line no-unused-vars
          (async () => {
            try {
              await ensureMinInterval();
              await doNetwork(kind, url);
            } catch {}
          })();
          return;
        }
      }
    }

    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, preferredKind]);

  return {
    loading: state.loading,
    data: state.data,
    error: state.error,
    resolvedKind: state.resolvedKind, // actual kind used after fallback, e.g., "three-hourly"
    refresh,
  };
}
