// src/hooks/useMetOfficeWeather.js
import { useEffect, useRef, useState } from "react";

/**
 * Always fetch the hourly feed (clean numeric temps) and let the UI
 * decide how many hours to show. This avoids the percentile packs that
 * some three-hourly payloads return.
 */
export default function useMetOfficeWeather({
  // granularity is ignored intentionally (we always use 'hourly')
  settings = {},
  cacheSeed = "",
} = {}) {
  const [status, setStatus] = useState("idle");
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const lat = Number(settings?.weather?.lat);
  const lon = Number(settings?.weather?.lon);
  const apiKey = settings?.weather?.apiKey || settings?.secrets?.metofficeApiKey;

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !apiKey) {
      setStatus("idle"); setPoints([]); setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setStatus("loading"); setError(null);

      // Force the hourly endpoint for reliable numeric temps
      const url = `/met/sitespecific/v0/point/hourly?latitude=${lat}&longitude=${lon}`;

      try {
        const res = await fetch(url, {
          headers: {
            "x-metoffice-key": apiKey, // Vite proxy maps to `apikey`
            accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? " — " + txt.slice(0, 300) : ""}`);
        }

        const ctype = (res.headers.get("content-type") || "").toLowerCase();
        if (!ctype.includes("application/json")) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Gateway returned HTML (likely redirect).${txt ? " — " + txt.slice(0, 200) : ""}`);
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
  }, [lat, lon, apiKey, cacheSeed]);

  return { status, points, error };
}

function normalisePoints(json) {
  const ts =
    json?.features?.[0]?.properties?.timeSeries ||
    json?.features?.[0]?.timeseries ||
    json?.timeSeries ||
    [];

  return (Array.isArray(ts) ? ts : [])
    .map((t) => ({
      time: t.time || t.validTime || t.timeStamp || t.timestamp,
      // Hourly feed provides plain numbers for these:
      temperature:
        pickNumber(t.screenTemperature) ??
        pickNumber(t.airTemperature) ??
        pickNumber(t.feelsLikeTemperature) ??
        null,
      weatherCode:
        pickNumber(t.significantWeatherCode) ??
        pickNumber(t.weatherCode) ??
        null,
      isDaylight: t.isDaylight,
    }))
    .filter((p) => p.time);
}

function pickNumber(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === "object" && "value" in v) return pickNumber(v.value);
  return null;
}
