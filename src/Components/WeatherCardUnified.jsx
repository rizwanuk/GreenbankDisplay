import React, { useMemo } from "react";
import moment from "moment";
import useMetOfficeWeather from "../hooks/useMetOfficeWeather";

export default function WeatherCardUnified({ settings = {}, theme = {}, mode = "3h" }) {
  const lat = Number(settings["weather.lat"]);
  const lon = Number(settings["weather.lon"]);
  const dailyBudget = Number(settings["weather.dailyBudget"] || 500); // configurable via sheet

  const { loading, data, error, resolvedKind, refresh } = useMetOfficeWeather({
    lat,
    lon,
    mode,
    dailyBudget,
  });

  const banner = useMemo(() => {
    if (!error) return null;

    if (error.type === "rate-limit") {
      const t = error.until ? moment(error.until).local().format("HH:mm") : "later";
      return { color: "text-amber-300", text: `Weather temporarily rate-limited by provider. Next allowed at ${t}.` };
    }
    if (error.type === "client-budget") {
      const t = error.until ? moment(error.until).local().format("HH:mm") : "tomorrow";
      return { color: "text-yellow-300", text: `Local request budget reached. Auto-resumes at ${t}.` };
    }
    if (error.type === "http" && (error.status === 404 || error.status === 501)) {
      return { color: "text-red-300", text: `Endpoint not available here. Using fallback when possible.` };
    }
    if (error.type === "http") {
      return { color: "text-red-300", text: `Weather unavailable — ${error.status ? `HTTP ${error.status}` : "request failed"}.` };
    }
    return null;
  }, [error]);

  return (
    <div
      className={[
        theme?.bgColor || "bg-white/5",
        theme?.textColor || "text-white",
        theme?.fontEng || "font-poppins",
        "rounded-2xl backdrop-blur-md border",
        theme?.tileBorder || "border-white/10",
        "shadow-md px-4 py-4",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xl font-semibold">Weather</div>
        <button
          onClick={() => refresh(true)}
          className="text-sm border border-white/20 rounded px-2 py-0.5 hover:bg-white/10"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {banner && <div className={`${banner.color} mb-2`}>{banner.text}</div>}

      {loading && !data && <div className="opacity-80">Loading…</div>}

      {!loading && data && (
        <div className="text-white/80 text-sm">
          <div className="mb-2">
            <span className="opacity-70">Source:</span> <span className="uppercase">{resolvedKind || "—"}</span>
          </div>

          {/* TODO: keep your existing rendering of tiles/periods here. */}
          {/* The hook now guarantees data is from an available endpoint and cached. */}
        </div>
      )}

      {!loading && !data && !banner && (
        <div className="text-white/70">No data available.</div>
      )}
    </div>
  );
}
