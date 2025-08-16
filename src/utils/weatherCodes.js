// utils/weatherCodes.js

// Minimal Met Office significant weather code map (0–30).
// Supports both numeric codes and a few string fallbacks.
const MO = {
  0: { d: { label: "Sunny", icon: "☀️" }, n: { label: "Clear", icon: "🌙" } }, // Clear night / Sunny day
  1: { d: { label: "Sunny", icon: "☀️" }, n: { label: "Clear", icon: "🌙" } }, // Some feeds use 1 for day
  2: { d: { label: "Partly cloudy", icon: "🌤️" }, n: { label: "Partly cloudy", icon: "☁️" } },
  3: { d: { label: "Partly cloudy", icon: "🌤️" }, n: { label: "Partly cloudy", icon: "☁️" } },
  5: { d: { label: "Mist", icon: "🌫️" }, n: { label: "Mist", icon: "🌫️" } },
  6: { d: { label: "Fog", icon: "🌫️" }, n: { label: "Fog", icon: "🌫️" } },
  7: { d: { label: "Cloudy", icon: "☁️" }, n: { label: "Cloudy", icon: "☁️" } },
  8: { d: { label: "Overcast", icon: "☁️" }, n: { label: "Overcast", icon: "☁️" } },
  9: { d: { label: "Light rain shower", icon: "🌦️" }, n: { label: "Light rain shower", icon: "🌧️" } },
  10:{ d: { label: "Light rain shower", icon: "🌦️" }, n: { label: "Light rain shower", icon: "🌧️" } },
  11:{ d: { label: "Drizzle", icon: "🌧️" }, n: { label: "Drizzle", icon: "🌧️" } },
  12:{ d: { label: "Light rain", icon: "🌧️" }, n: { label: "Light rain", icon: "🌧️" } },
  13:{ d: { label: "Heavy rain shower", icon: "⛈️" }, n: { label: "Heavy rain shower", icon: "🌧️" } },
  14:{ d: { label: "Heavy rain shower", icon: "⛈️" }, n: { label: "Heavy rain shower", icon: "🌧️" } },
  15:{ d: { label: "Heavy rain", icon: "🌧️" }, n: { label: "Heavy rain", icon: "🌧️" } },
  16:{ d: { label: "Sleet shower", icon: "🌨️" }, n: { label: "Sleet shower", icon: "🌨️" } },
  17:{ d: { label: "Sleet shower", icon: "🌨️" }, n: { label: "Sleet shower", icon: "🌨️" } },
  18:{ d: { label: "Sleet", icon: "🌨️" }, n: { label: "Sleet", icon: "🌨️" } },
  19:{ d: { label: "Hail shower", icon: "🌨️" }, n: { label: "Hail shower", icon: "🌨️" } },
  20:{ d: { label: "Hail shower", icon: "🌨️" }, n: { label: "Hail shower", icon: "🌨️" } },
  21:{ d: { label: "Hail", icon: "🌨️" }, n: { label: "Hail", icon: "🌨️" } },
  22:{ d: { label: "Light snow shower", icon: "🌨️" }, n: { label: "Light snow shower", icon: "🌨️" } },
  23:{ d: { label: "Light snow shower", icon: "🌨️" }, n: { label: "Light snow shower", icon: "🌨️" } },
  24:{ d: { label: "Light snow", icon: "🌨️" }, n: { label: "Light snow", icon: "🌨️" } },
  25:{ d: { label: "Heavy snow shower", icon: "🌨️" }, n: { label: "Heavy snow shower", icon: "🌨️" } },
  26:{ d: { label: "Heavy snow shower", icon: "🌨️" }, n: { label: "Heavy snow shower", icon: "🌨️" } },
  27:{ d: { label: "Heavy snow", icon: "❄️" }, n: { label: "Heavy snow", icon: "❄️" } },
  28:{ d: { label: "Thunder shower", icon: "⛈️" }, n: { label: "Thunder shower", icon: "⛈️" } },
  29:{ d: { label: "Thunder shower", icon: "⛈️" }, n: { label: "Thunder shower", icon: "⛈️" } },
  30:{ d: { label: "Thunder", icon: "⛈️" }, n: { label: "Thunder", icon: "⛈️" } },
};

function normalise(code) {
  if (code == null) return null;
  if (typeof code === "number") return code;
  const n = parseInt(code, 10);
  if (!Number.isNaN(n)) return n;

  // string fallbacks (non-exhaustive)
  const s = String(code).toLowerCase();
  if (s.includes("clear")) return 0;
  if (s.includes("sun")) return 1;
  if (s.includes("partly") || s.includes("part")) return 3;
  if (s.includes("overcast")) return 8;
  if (s.includes("cloud")) return 7;
  if (s.includes("drizzle")) return 11;
  if (s.includes("rain")) return s.includes("heavy") ? 15 : 12;
  if (s.includes("sleet")) return 18;
  if (s.includes("hail")) return 21;
  if (s.includes("snow")) return s.includes("heavy") ? 27 : 24;
  if (s.includes("thunder")) return 30;
  if (s.includes("fog")) return 6;
  if (s.includes("mist")) return 5;
  return null;
}

export function codeToLabel(code, isDay = true) {
  const c = normalise(code);
  if (c != null && MO[c]) return (isDay ? MO[c].d : MO[c].n).label;
  return isDay ? "Clear" : "Clear";
}

export function codeToIcon(code, isDay = true) {
  const c = normalise(code);
  if (c != null && MO[c]) return (isDay ? MO[c].d : MO[c].n).icon;
  return isDay ? "☀️" : "🌙";
}
