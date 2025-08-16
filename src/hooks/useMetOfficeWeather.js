// src/hooks/useMetOfficeWeather.js
import { useEffect, useRef, useState } from "react";

/**
 * Fetch Met Office Site-Specific forecast.
 * In dev: via Vite proxy at /met  -> datahub (needs client header x-metoffice-key)
 * In prod: via Vercel function at /api/met (server injects API key)
 */
export default function useMetOfficeWeather({
  granularity = "three-hourly", // 'hourly' | 'three-hourly'
  settings = {},
  cacheSeed = "",
} = {}) {
  const [status, setStatus] = useState("idle");
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const lat = Number(settings?.weather?.lat);
  const lon = Number(settings?.weather?.lon);

  // Local dev can provide a key (Vite env or sheet). In prod, we DON'T need it.
  const apiKey =
    settings?.weather?.apiKey ||
    settings?.secrets?.metofficeApiKey ||
    import.meta.env.VITE_METOFFICE_API_KEY;

  const endpoint = granularity === "hourly" ? "hourly" : "three-hourly";

  // Choose base path:
  //   - explicit override via env if you want (VITE_MET_BASE)
  //   - otherwise: localhost -> /met (vite proxy), hosted -> /api/met (vercel fn)
  const host = typeof window !== "undefined" ? window.location.host : "";
  const isLocalhost = /^localhost(:\d+)?$/i.test(host);
  const base =
    import.meta.env.VITE_MET_BASE ||
    (isLocalhost ? "/met" : "/api/met");

  // Only attach the API key header when talking to the **dev proxy** (/met)
  const useLocalProxy = base.startsWith("/met");

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setStatus("idle");
      setPoints([]);
      setError(null);
      return;
    }

    // In dev we require a key; in prod the serverless function provides it.
    if (useLocalProxy && !apiKey) {
      setStatus("error");
      setError(new Error("Missing API key for local proxy (/met)."));
      setPoints([]);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setStatus("loading");
      setError(null);

      const url = `${base}/sitespecific/v0/point/${endpoint}?latitude=${lat}&longitude=${lon}`;

      try {
        const headers = { accept: "application/json" };
        if (useLocalProxy && apiKey) {
          // Vite dev proxy maps x-metoffice-key -> apikey upstream
          headers["x-metoffice-key"] = apiKey;
        }

        const res = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(
            `HTTP ${res.status} ${res.statusText}${
              txt ? " — " + txt.slice(0, 300) : ""
            }`
          );
        }

        const ctype = (res.headers.get("content-type") || "").toLowerCase();
        if (!ctype.includes("application/json")) {
          const txt = await res.text().catch(() => "");
          throw new Error(
            `Gateway returned non-JSON (likely a redirect or HTML).${
              txt ? " — " + txt.slice(0, 200) : ""
            }`
          );
        }

        const json = await res.json();
        const out = normalisePoints(json);
        setPoints(out);
        setStatus("success");
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error("🌧️  MetOffice fetch error:", e);
        setError(e);
        setPoints([]);
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [lat, lon, apiKey, endpoint, cacheSeed, base, useLocalProxy]);

  return { status, points, error };
}

function normalisePoints(json) {
  // v0 site-specific shape
  const ts =
    json?.features?.[0]?.properties?.timeSeries ||
    json?.features?.[0]?.timeseries ||
    json?.timeSeries ||
    [];

  return (Array.isArray(ts) ? ts : [])
    .map((t) => {
      const time =
        t.time || t.validTime || t.timeStamp || t.timestamp || null;

      // Temperature fields differ per granularity:
      // three-hourly → maxScreenAirTemp / minScreenAirTemp
      // hourly → screenTemperature / airTemperature
      const dayMax = coerceNum(t.maxScreenAirTemp);
      const nightMin = coerceNum(t.minScreenAirTemp);
      const screen = coerceNum(t.screenTemperature ?? t.airTemperature);

      // If both max/min exist, pick the average as a representative slot temp
      // (you can change to max/min if you prefer)
      const tri =
        isFinite(dayMax) && isFinite(nightMin)
          ? (dayMax + nightMin) / 2
          : isFinite(dayMax)
          ? dayMax
          : isFinite(nightMin)
          ? nightMin
          : undefined;

      const temperature =
        (typeof tri === "number" ? tri : undefined) ??
        (isFinite(screen) ? screen : null);

      const weatherCode =
        t.significantWeatherCode ??
        t.weatherCode ??
        t.wx_code ??
        t["weather_code"] ??
        null;

      return {
        time,
        temperature,
        weatherCode,
        isDaylight: t.isDaylight ?? t["is_daylight"],
      };
    })
    .filter((p) => p.time);
}

function coerceNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
