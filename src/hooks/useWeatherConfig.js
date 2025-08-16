import { useEffect, useState } from "react";

/** Sheet-only weather config.
 * Reads:
 *   - weather.lat, weather.lon  (preferred)
 *   - secrets.metofficeApiKey   (or weather.apiKey as fallback)
 *   - weather.postcode          (optional fallback if lat/lon absent)
 * Resolves postcode via postcodes.io when needed.
 * Returns: { status, error, lat, lon, apiKey, postcode }
 * status: 'ready' | 'resolving' | 'missingApiKey' | 'missingLocation' | 'error'
 */
export default function useWeatherConfig(settingsMap = {}) {
  const latSheet = toNum(settingsMap["weather.lat"]);
  const lonSheet = toNum(settingsMap["weather.lon"]);
  const apiKey =
    (settingsMap["secrets.metofficeApiKey"] ||
      settingsMap["weather.apiKey"] ||
      "").toString().trim();
  const postcode = (settingsMap["weather.postcode"] || "").toString().trim();

  const [state, setState] = useState(() => {
    if (!apiKey) return { status: "missingApiKey" };
    if (isNum(latSheet) && isNum(lonSheet))
      return { status: "ready", lat: latSheet, lon: lonSheet, apiKey, postcode, error: "" };
    if (postcode) return { status: "resolving", lat: null, lon: null, apiKey, postcode, error: "" };
    return { status: "missingLocation", lat: null, lon: null, apiKey, postcode, error: "" };
  });

  useEffect(() => {
    let abort = false;
    async function resolveIfNeeded() {
      if (!apiKey) {
        setState({ status: "missingApiKey", lat: null, lon: null, apiKey: "", postcode, error: "" });
        return;
      }
      if (isNum(latSheet) && isNum(lonSheet)) {
        setState({ status: "ready", lat: latSheet, lon: lonSheet, apiKey, postcode, error: "" });
        return;
      }
      if (!postcode) {
        setState({ status: "missingLocation", lat: null, lon: null, apiKey, postcode, error: "" });
        return;
      }
      setState((s) => ({ ...s, status: "resolving", error: "" }));
      try {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
        if (!res.ok) throw new Error(`Postcode lookup failed (${res.status})`);
        const json = await res.json();
        const lat = toNum(json?.result?.latitude);
        const lon = toNum(json?.result?.longitude);
        if (!isNum(lat) || !isNum(lon)) throw new Error("No coordinates for postcode");
        if (abort) return;
        setState({ status: "ready", lat, lon, apiKey, postcode, error: "" });
      } catch (e) {
        if (abort) return;
        setState({ status: "error", lat: null, lon: null, apiKey, postcode, error: e?.message || "Lookup failed" });
      }
    }
    resolveIfNeeded();
    return () => { abort = true; };
  }, [latSheet, lonSheet, apiKey, postcode]);

  return state;
}

function toNum(v) {
  const s = (v ?? "").toString().trim();
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function isNum(n) { return Number.isFinite(n); }
