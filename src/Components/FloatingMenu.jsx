import React, { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { DISPLAY_MODE_PRESETS } from "../hooks/useLocalDisplayMode";

export default function FloatingMenu({
  // theme
  themeName,
  setThemeName,
  themeOptions = [],
  // display mode
  displayMode,
  setDisplayMode,
  // weather controls (optional; slideshow passes false)
  showWeatherControls = true,
  showWeather,
  setShowWeather,
  weatherMode,
  setWeatherMode,
}) {
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);

  // Auto-hide after 10s whenever panel is open and not hovered
  useEffect(() => {
    if (!visible || hovering) return;
    const t = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(t);
  }, [visible, hovering]);

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        onClick={() => setVisible((v) => !v)}
        className="rounded-full p-2 bg-black/60 hover:bg-black/70 backdrop-blur shadow text-white"
        aria-label="Display settings"
        title="Display settings"
      >
        <Settings2 className="w-5 h-5" />
      </button>

      {visible && (
        <div
          className="mt-2 w-72 rounded-xl bg-black/80 backdrop-blur p-3 shadow-xl border border-white/10 text-white"
          role="dialog"
          aria-label="Display settings menu"
        >
          {/* Theme */}
          <div className="mb-3">
            <label className="block text-sm mb-1 text-white/80">Theme</label>
            <select
              className="w-full p-1 rounded bg-white text-black"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            >
              {themeOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Display Mode (local only) */}
          <div className="mb-4">
            <label className="block text-sm mb-1 text-white/80">Display mode (local)</label>
            <select
              className="w-full p-1 rounded bg-white text-black"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value)}
            >
              {DISPLAY_MODE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/60">
              Saved on this device only. Auto-hides in 10s.
            </p>
          </div>

          {/* Weather controls (optional) */}
          {showWeatherControls && (
            <>
              <div className="mb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-white"
                    checked={!!showWeather}
                    onChange={(e) => setShowWeather(e.target.checked)}
                  />
                  <span className="text-sm text-white/90">Show weather</span>
                </label>
              </div>

              <div className="mb-1">
                <label className="block text-sm mb-1 text-white/80">Weather view</label>
                <select
                  className="w-full p-1 rounded bg-white text-black"
                  value={weatherMode}
                  onChange={(e) => setWeatherMode(e.target.value)}
                  disabled={!showWeather}
                >
                  <option value="now">Now (hourly)</option>
                  <option value="3h">3-hourly</option>
                  <option value="today">Today</option>
                  <option value="24h">Next 24 hours</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
