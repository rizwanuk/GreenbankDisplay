import React from "react";
import useUiSetting from "../hooks/useUiSetting";
import useWeatherMode from "../hooks/useWeatherMode";

export default function WeatherControls({ settingsMap }) {
  const [mode, setMode] = useWeatherMode(settingsMap);
  const [postcode, setPostcode] = useUiSetting("ui.weatherPostcode", "");
  const [lat, setLat] = useUiSetting("ui.weatherLat", "");
  const [lon, setLon] = useUiSetting("ui.weatherLon", "");
  const [apiKey, setApiKey] = useUiSetting("ui.metofficeApiKey", "");

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="text-xs mb-1">Weather card</div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded text-sm w-full"
        >
          <option value="off">Off</option>
          <option value="now">Now</option>
          <option value="3h">Next 3h</option>
          <option value="today">Today</option>
        </select>
      </div>

      <div>
        <div className="text-xs mb-1">Postcode (fallback if no lat/lon)</div>
        <input
          placeholder="e.g. BS5 6HE"
          value={postcode}
          onChange={(e) => {
            setPostcode(e.target.value.trim());
            localStorage.removeItem("ui.weatherLat");
            localStorage.removeItem("ui.weatherLon");
          }}
          className="bg-white text-black px-2 py-1 rounded text-sm w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded text-sm"
        />
        <input
          placeholder="Longitude"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded text-sm"
        />
      </div>

      <div>
        <div className="text-xs mb-1">Met Office API key</div>
        <input
          placeholder="DataHub API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="bg-white text-black px-2 py-1 rounded text-sm w-full"
        />
      </div>
    </div>
  );
}
