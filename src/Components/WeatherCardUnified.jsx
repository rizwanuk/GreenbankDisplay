import React, { useMemo } from "react";
import moment from "moment";
import useMetOfficeWeather from "../hooks/useMetOfficeWeather";
import useWeatherConfig from "../hooks/useWeatherConfig";
import useWeatherMode from "../hooks/useWeatherMode";
import { codeToIcon, codeToLabel } from "../utils/weatherCodes";

const fontClassFromTheme = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (s.startsWith("font-")) return s;
  const map = {
    rubik: "font-rubik",
    inter: "font-inter",
    cairo: "font-cairo",
    lalezar: "font-lalezar",
    poppins: "font-poppins",
  };
  return map[s.toLowerCase()] || "";
};

export default function WeatherCardUnified({ settings, mode, theme = {}, className = "" }) {
  const [derivedMode] = useWeatherMode(settings);
  const effectiveMode = normaliseMode(mode ?? derivedMode); // 'off'|'now'|'3h'|'today'|'24h'

  const granularity = effectiveMode === "now" ? "hourly" : "three-hourly";
  const cfg = useWeatherConfig(settings);
  const cacheSeed = settings?.["meta.lastUpdated"] || "";

  const metOfficeArgs =
    cfg.status === "ready"
      ? {
          granularity,
          settings: {
            weather: { lat: cfg.lat, lon: cfg.lon },
            secrets: { metofficeApiKey: cfg.apiKey },
          },
          cacheSeed,
        }
      : { granularity, settings: {}, cacheSeed };

  const weather = useMetOfficeWeather(metOfficeArgs);

  const toLocal = (iso) => moment.parseZone(iso).local();
  const isDayByHour = (m) => m.hour() >= 6 && m.hour() < 18;

  const { slots, todayCount } = useMemo(() => {
    const pts = Array.isArray(weather.points)
      ? weather.points.map((p) => ({ ...p, _local: toLocal(p.time) }))
      : [];

    if (effectiveMode === "off" || pts.length === 0) return { slots: [], todayCount: 0 };

    const now = moment();
    const idx = Math.max(0, pts.findIndex((p) => p._local.isSameOrAfter(now)));

    if (effectiveMode === "now") {
      return { slots: pts.slice(idx, idx + 1), todayCount: 0 };
    }

    if (effectiveMode === "3h") {
      // Next 3 periods (~9h on 3-hourly feed)
      return { slots: pts.slice(idx, idx + 3), todayCount: 0 };
    }

    if (effectiveMode === "24h") {
      // Next 24h window
      const end = moment(now).add(24, "hours");
      const within24h = pts.filter(
        (p) => p._local.isSameOrAfter(now) && p._local.isBefore(end)
      );

      // Resample to exactly 6 evenly spaced slots
      const targetCount = 6;
      if (within24h.length <= targetCount) return { slots: within24h, todayCount: 0 };

      const step = within24h.length / targetCount;
      const picked = Array.from({ length: targetCount }, (_, i) =>
        within24h[Math.floor(i * step)]
      );
      return { slots: picked, todayCount: 0 };
    }

    // 'today' mode
    const sameDay = pts.filter(
      (p) => p._local.isSameOrAfter(now) && p._local.isSame(now, "day")
    );
    const slice = sameDay.slice(0, 6);
    return { slots: slice, todayCount: slice.length };
  }, [weather.points, effectiveMode]);

  if (effectiveMode === "off") return null;

  const container = `${theme?.bgColor || "bg-white/10"} ${theme?.textColor || "text-white"}`;
  const tileBg = theme?.tileBgColor || "bg-white/5";
  const tileBrd = theme?.tileBorder || "border-white/10";
  const fontEngClass = fontClassFromTheme(theme?.fontEng);

  // Grid classes per mode
  const gridForToday = (() => {
    const n = Math.max(1, Math.min(6, Number(todayCount || 0)));
    return (
      {
        1: "grid grid-cols-1",
        2: "grid grid-cols-2 gap-1.5 sm:gap-2",
        3: "grid grid-cols-3 gap-1.5 sm:gap-2",
        4: "grid grid-cols-4 gap-1.5 sm:gap-2",
        5: "grid grid-cols-5 gap-1.5 sm:gap-2",
        6: "grid grid-cols-6 gap-1.5 sm:gap-2",
      }[n] || "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2"
    );
  })();

  const gridClass =
    effectiveMode === "now"
      ? "grid grid-cols-1"
      : effectiveMode === "3h"
      ? "grid grid-cols-3 gap-1.5 sm:gap-2" // exactly 3 periods
      : effectiveMode === "24h"
      ? "grid grid-cols-6 gap-1.5 sm:gap-2" // fixed 6 tiles
      : gridForToday; // dynamic 1–6 columns

  let body = null;

  if (cfg.status === "missingApiKey") {
    body = (
      <div className="text-sm opacity-90">
        Setup required: add <b>secrets.metofficeApiKey</b> in the Google Sheet.
      </div>
    );
  } else if (cfg.status === "resolving") {
    body = (
      <div className="text-sm opacity-90">
        Resolving postcode <b>{cfg.postcode}</b>…
      </div>
    );
  } else if (
    cfg.status === "missingLocation" ||
    !Number.isFinite(cfg.lat) ||
    !Number.isFinite(cfg.lon)
  ) {
    body = (
      <div className="text-sm opacity-90">
        Add <b>weather.lat</b>/<b>weather.lon</b> or <b>weather.postcode</b> in the Sheet.
        {cfg.error && <div className="text-red-200 mt-1">{cfg.error}</div>}
      </div>
    );
  } else {
    if (weather.status === "error") {
      const msg = weather?.error?.message || "Unknown error";
      body = <div className="text-sm text-red-200">Weather unavailable — {msg}</div>;
    } else if (slots.length === 0) {
      body = <div className="text-sm opacity-90">Loading forecast…</div>;
    } else {
      body = (
        <div className={gridClass}>
          {slots.map((p, i) => {
            const m = p._local;
            const isDay = p.isDaylight != null ? !!p.isDaylight : isDayByHour(m);
            const icon = codeToIcon(p.weatherCode, isDay);
            const label = codeToLabel(p.weatherCode, isDay);
            const temp = Number.isFinite(p.temperature) ? Math.round(p.temperature) : null;
            const timeLabel = effectiveMode !== "today" && i === 0 ? "Now" : m.format("HH:mm");

            return (
              <div
                key={p.time || i}
                className={`relative rounded-xl ${tileBg} border ${tileBrd} text-center leading-tight px-2 py-1.5`}
              >
                {/* Top-left: time */}
                <div className="absolute left-2 top-1 text-[14px] md:text-[15px] font-semibold leading-none">
                  {timeLabel}
                </div>

                {/* Top-right: condition */}
                <div className="absolute right-2 top-1 text-[10px] opacity-85 leading-none max-w-[60%] truncate text-right">
                  {label}
                </div>

                {/* Center: icon + temp */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <span className="leading-none text-[32px] md:text-[34px] lg:text-[36px]">
                    {icon}
                  </span>
                  <span className="leading-none font-semibold text-[22px] md:text-[24px] lg:text-[28px]">
                    {temp !== null ? `${temp}°C` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }

  const debugOn = String(settings?.["weather.debug"] || "").toUpperCase() === "TRUE";
  const debug = debugOn ? (
    <div className="mt-2 text-[10px] opacity-70">
      mode={effectiveMode} granularity={granularity} cfg={cfg.status} wx={weather.status}
      {Number.isFinite(cfg.lat) && ` lat=${cfg.lat.toFixed(4)}`}
      {Number.isFinite(cfg.lon) && ` lon=${cfg.lon.toFixed(4)}`}
      {slots.length ? ` slots=${slots.length}` : ""}
    </div>
  ) : null;

  return (
    <div
      className={`rounded-2xl p-2 shadow ${container} backdrop-blur ${fontEngClass} ${className}`}
      style={!fontEngClass && theme?.fontEng ? { fontFamily: theme.fontEng } : undefined}
    >
      {body}
      {debug}
    </div>
  );
}

function normaliseMode(m) {
  const s = String(m || "").toLowerCase().trim();
  if (s === "daily") return "today";
  if (s === "next24h") return "24h";
  return ["off", "now", "3h", "today", "24h"].includes(s) ? s : "off";
}
