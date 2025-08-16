import React, { useMemo } from "react";
import moment from "moment";
import useMetOfficeWeather from "../hooks/useMetOfficeWeather"; // shared backend hook
import { codeToIcon, codeToLabel } from "../utils/weatherCodes";

/**
 * Compact weather badge: [Icon] Label TEMP°C
 * Props:
 * - settings: parsed settings (optional if your hook reads settings internally)
 * - lat, lon: number overrides (optional)
 * - granularity: 'hourly' | '3-hourly' | 'daily' (default 'hourly' for headers)
 * - className: extra Tailwind classes
 * - showLabel: boolean (default true) — set false if you want icon + temp only
 */
export default function WeatherBadgeMini({
  settings,
  lat,
  lon,
  granularity = "hourly",
  className = "",
  showLabel = true,
}) {
  const { status, points } = useMetOfficeWeather({ lat, lon, granularity, settings });

  const point = useMemo(() => {
    if (!points?.length) return null;
    const idx = points.findIndex((p) => moment(p.time).isSameOrAfter(moment()));
    return points[Math.max(0, idx)] || points[0];
  }, [points]);

  if (status === "loading" && !point) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 ${className}`}>
        <span className="text-base">⏳</span>
      </div>
    );
  }
  if (!point) return null;

  const icon = codeToIcon(point.weatherCode);
  const label = codeToLabel(point.weatherCode);
  const temp = Number.isFinite(point.temperature) ? Math.round(point.temperature) : null;

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 ${className}`}>
      <span className="text-xl leading-none">{icon}</span>
      {showLabel && <span className="text-base">{label}</span>}
      {temp !== null && <span className="text-lg font-semibold">{temp}°C</span>}
    </div>
  );
}
