import React, { useMemo } from "react";
import moment from "moment";
import useMetOfficeWeather from "../hooks/useMetOfficeWeather";
import { codeToIcon, codeToLabel } from "../utils/weatherCodes";

export default function WeatherCardUnified({ settings = {}, theme = {}, mode = "3h", className = "" }) {
  const lat = Number(settings["weather.lat"]);
  const lon = Number(settings["weather.lon"]);
  const dailyBudget = Number(settings["weather.dailyBudget"] || 500);

  const { loading, data, error, resolvedKind } = useMetOfficeWeather({
    lat,
    lon,
    mode,          // "now" | "3h" | "today" | "24h"
    dailyBudget,
  });

  // ---------- Parse helpers ----------
  function pickTimeSeries(json) {
    if (!json) return [];
    if (Array.isArray(json.features) && json.features[0]?.properties?.timeSeries) {
      return json.features[0].properties.timeSeries;
    }
    if (json.properties?.timeSeries) return json.properties.timeSeries;
    if (json.timeSeries) return json.timeSeries;
    return [];
  }

  function firstNum(v) {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pickTemp(p) {
    const t3h =
      firstNum(p.screenTemperature) ??
      firstNum(p.temperature) ??
      firstNum(p.temp) ??
      firstNum(p.feelsLikeTemperature);

    const tdaily =
      firstNum(p.dayMaxScreenTemperature) ??
      firstNum(p.dayMaxTemp) ??
      firstNum(p.maxScreenAirTemp) ??
      firstNum(p.maxTemp) ??
      firstNum(p.nightMinScreenTemperature) ??
      firstNum(p.minScreenAirTemp) ??
      firstNum(p.minTemp);

    if (resolvedKind === "daily") return tdaily ?? t3h;
    return t3h ?? tdaily;
  }

  function normalizePoint(p) {
    const time = p.time || p.validTime || p.timestamp || null;
    const temp = pickTemp(p);
    const code =
      firstNum(p.significantWeatherCode) ??
      firstNum(p.weatherType) ??
      firstNum(p.weatherCode) ??
      p.wx_code ??
      null;

    const isDay =
      typeof p.isDaylight === "boolean"
        ? p.isDaylight
        : (() => {
            if (!time) return true;
            const h = moment(time).local().hour();
            return h >= 7 && h <= 20;
          })();

    return { time, temp, code, isDay };
  }

  const allPoints = useMemo(() => {
    const ts = pickTimeSeries(data);
    if (!Array.isArray(ts) || !ts.length) return [];
    return ts.map(normalizePoint).filter((p) => p.time != null);
  }, [data, resolvedKind]);

  // ---------- Mode selection (no past; cap 6) ----------
  const points = useMemo(() => {
    if (!allPoints.length) return [];

    const now = moment();
    const futureIdx = Math.max(0, allPoints.findIndex((p) => moment(p.time).isSameOrAfter(now)));

    let arr;
    if (mode === "now") {
      arr = [allPoints[futureIdx] || allPoints[allPoints.length - 1]].filter(Boolean);
    } else if (mode === "3h") {
      arr = allPoints.slice(futureIdx, futureIdx + 3);
    } else if (mode === "today") {
      const todayStr = moment().format("YYYY-MM-DD");
      if (resolvedKind === "daily") {
        arr = allPoints.filter((p) => moment(p.time).local().format("YYYY-MM-DD") === todayStr);
      } else {
        arr = allPoints.filter((p) => {
          const m = moment(p.time).local();
          return m.format("YYYY-MM-DD") === todayStr && m.isSameOrAfter(now);
        });
      }
    } else if (mode === "24h") {
      const until = moment().add(24, "hours");
      arr = allPoints.filter((p) => moment(p.time).isSameOrAfter(now) && moment(p.time).isBefore(until));
    } else {
      arr = allPoints.slice(futureIdx, futureIdx + 3);
    }

    return arr.slice(0, 6); // hard cap at 6
  }, [allPoints, mode, resolvedKind]);

  // ---------- Rendering ----------
  const containerClasses = [
    theme?.bgColor || "bg-white/5",
    theme?.textColor || "text-white",
    theme?.fontEng || "font-poppins",
    "rounded-2xl backdrop-blur-md border",
    theme?.tileBorder || "border-white/10",
    "shadow-md px-4 py-3",
    className,
  ].join(" ");

  // Only show error banner if we have nothing to render (avoid flashes)
  const showBanner = !loading && (!points || points.length === 0) && error;
  const bannerText = error
    ? error.type === "rate-limit"
      ? `Weather rate-limited.`
      : error.type === "client-budget"
      ? `Local request budget reached.`
      : error.type === "http" && (error.status === 404 || error.status === 501)
      ? `Endpoint not available.`
      : `Weather unavailable${error.status ? ` — HTTP ${error.status}` : ""}.`
    : null;

  if (loading && !points.length) {
    return <div className={containerClasses}><div className="text-white/70 text-sm">Loading weather…</div></div>;
  }

  if (!points.length) {
    return <div className={containerClasses}><div className="text-white/70 text-sm">{bannerText || "No weather data."}</div></div>;
  }

  // Dynamic grid columns (1–6) so items are justified; one row only (no height growth)
  const colsMap = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  const colsClass = colsMap[Math.min(points.length, 6)] || "grid-cols-6";

  return (
    <div className={containerClasses}>
      {showBanner && <div className="text-red-300 text-xs mb-1">{bannerText}</div>}

      <ul className={`grid ${colsClass} gap-6 items-end overflow-hidden`}>
        {points.map((p, i) => {
          const icon = codeToIcon(p.code, p.isDay);
          const label = codeToLabel(p.code, p.isDay);

          const t =
            mode === "today" && resolvedKind === "daily"
              ? moment(p.time).local().format("ddd")
              : i === 0 && mode === "now"
              ? "Now"
              : moment(p.time).local().format(resolvedKind === "daily" ? "ddd" : "HH:mm");

          const tempStr = Number.isFinite(p.temp) ? `${Math.round(p.temp)}°C` : null;

          return (
            <li key={p.time || i} className="flex flex-col items-center">
              {/* Line 1: big icon */}
              <div className="text-5xl leading-none">{icon}</div>

              {/* Line 2: big temp */}
              {tempStr && <div className="text-xl font-bold mt-1">{tempStr}</div>}

              {/* Line 3: time · label */}
              <div className="text-sm opacity-90 mt-0.5 text-center max-w-[11rem] truncate">
                <span className="font-semibold">{t}</span>
                <span className="opacity-70"> · </span>
                <span>{label}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
