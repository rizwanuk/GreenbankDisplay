// Met Office fetcher with cache, rate-limit handling, fallback, and client-side daily budget
// Dev:  hits /met/... via Vite proxy and sends x-metoffice-key from VITE_MET_KEY (also adds ?apikey=...)
// Prod: hits /api/met/... (Vercel function injects credentials)
import { useEffect, useMemo, useRef, useState } from "react";

// --- BASE selection ----------------------------------------------------------
const IS_DEV = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;
const DEV_BASE  = "/met/sitespecific/v0/point";     // Vite proxy → Met Office
const PROD_BASE = "/api/met/sitespecific/v0/point";  // Vercel API route
const BASE = IS_DEV ? DEV_BASE : PROD_BASE;

// Optional dev key (put this in .env.local as VITE_MET_KEY=xxxxx)
const DEV_KEY = IS_DEV ? import.meta.env.VITE_MET_KEY : undefined;

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

// Default local daily budget if not provided by settings
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

function normCoord(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // clamp realistic bounds and fix precision to avoid 400 from odd values
  const clamped = Math.max(-180, Math.min(180, n));
  return Number(clamped.toFixed(6));
}

function buildUrl(kind, lat, lon) {
  const la = normCoord(lat);
  const lo = normCoord(lon);
  const q = new URLSearchParams({
    latitude: String(la ?? ""),
    longitude: String(lo ?? ""),
  });

  // In dev, also add ?apikey=... as some edges prefer query over header
  if (IS_DEV && DEV_KEY) q.set("apikey", DEV_KEY);

  return `${BASE}/${kind}?${q.toString()}`;
}

async function fetchOnce(url) {
  const headers = { Accept: "application/json" };
  // In dev only, send our private header which the Vite proxy converts to `apikey`
  if (IS_DEV && DEV_KEY) {
    headers["x-metoffice-key"] = DEV_KEY;
  }

  const res = await fetch(url, { headers });
  let payload = null;
  if (!res.ok) {
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    // Surface the provider message in console for precise diagnosis
    if (payload) {
      console.error("[MetOffice ERROR]", res.status, payload);
    } else {
      console.error("[MetOffice ERROR]", res.status, "no JSON body");
    }
    const e = new Error(`HTTP ${res.status}`);
    e.status = res.status;
    e.raw = payload;
    throw e;
  }
  return res.json();
}

function parseNextAccessTime(val) {
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
    if (mode === "now") return "hourly";  // may fallback if unavailable
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

    // Serve fresh-enough cache immediately
    if (!force) {
      for (const { kind, url } of urlsToTry) {
        const cached = getCache(url);
        const now = Date.now();
        if (cached && now - (cached.savedAt || 0) < ttlFor(kind)) {
          setState({ loading: false, data: cached.data, error: null, resolvedKind: kind });
          return;
        }
      }
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      takeToken(dailyBudget);
      await ensureMinInterval();

      let lastErr = null;
      for (let i = 0; i < urlsToTry.length; i++) {
        const { kind, url } = urlsToTry[i];
        try {
          const data = await doNetwork(kind, url);
          setCache(url, { savedAt: Date.now(), data });
          setState({ loading: false, data, error: null, resolvedKind: kind });
          return;
        } catch (err) {
          lastErr = err;

          // If product/endpoint unavailable, fall back
          if (err?.status === 404 || err?.status === 501) continue;

          // If 400 with payload text indicating usage/limits or bad coord, try next or stale cache
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
        }
      }

      setState({
        loading: false,
        data: null,
        error: {
          type: "http",
          status: lastErr?.status || 0,
          message: lastErr?.message || "Request failed",
          raw: lastErr?.raw,
        },
        resolvedKind: null,
      });
    } catch (outer) {
      setState({
        loading: false,
        data: null,
        error: { type: "http", status: outer?.status || 0, message: outer?.message || "Request failed", raw: outer?.raw },
        resolvedKind: null,
      });
    }
  };

  async function doNetwork(kind, url) {
    if (inflight.has(url)) return inflight.get(url);
    const p = (async () => {
      try {
        const json = await fetchOnce(url);
        return json;
      } finally {
        inflight.delete(url);
      }
    })();
    inflight.set(url, p);
    return p;
  }

  const first = useRef(true);
  useEffect(() => {
    if (!urlsToTry.length) return;

    if (first.current) {
      first.current = false;
      for (const { kind, url } of urlsToTry) {
        const cached = getCache(url);
        const now = Date.now();
        if (cached && now - (cached.savedAt || 0) < ttlFor(kind)) {
          setState({ loading: false, data: cached.data, error: null, resolvedKind: kind });
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
    resolvedKind: state.resolvedKind,
    refresh,
  };
}
