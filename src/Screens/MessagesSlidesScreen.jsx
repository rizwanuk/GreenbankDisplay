// src/Screens/MessagesSlidesScreen.jsx
import "../index.css";
import React, { useEffect, useMemo, useRef } from "react";
import moment from "moment";

import SlideshowPanel from "../Components/SlideshowPanel";

import useSettings from "../hooks/useSettings";
import usePrayerTimes from "../hooks/usePrayerTimes";
import useDeviceId from "../hooks/useDeviceId";
import useRemoteDeviceConfig from "../hooks/useRemoteDeviceConfig";

import useLocalDisplayMode from "../hooks/useLocalDisplayMode";
import { getSettingsUrl } from "../utils/getSettingsUrl";

/* ---------------- helpers (copied from SlideshowScreen to keep behaviour consistent) ---------------- */

function buildSettingsMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    const g = (row?.Group || "").trim();
    const k = (row?.Key || "").trim();
    const v = row?.Value != null ? String(row.Value).trim() : "";
    if (!k || v === "") return;
    map[k] = v;
    if (g) map[`${g}.${k}`] = v;
  });
  return map;
}

function readGroup(map, prefix) {
  const out = {};
  const pfx = prefix.endsWith(".") ? prefix : prefix + ".";
  for (const [k, v] of Object.entries(map || {})) {
    if (k.startsWith(pfx)) out[k.slice(pfx.length)] = v;
  }
  return out;
}

function extractLastUpdatedFromSettingsRows(rows) {
  if (!rows) return "";

  // Shape 1: [{ Group, Key, Value }]
  if (Array.isArray(rows) && rows.length && !Array.isArray(rows[0])) {
    for (const r of rows) {
      const g = String(r?.Group || "").trim();
      const k = String(r?.Key || "").trim();
      const v = String(r?.Value ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
    return "";
  }

  // Shape 2: [["Group","Key","Value"], ["meta","lastUpdated","..."]]
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    const body = rows.slice(1);
    for (const r of body) {
      const g = String(r?.[0] || "").trim();
      const k = String(r?.[1] || "").trim();
      const v = String(r?.[2] ?? "").trim();
      if (g === "meta" && k === "lastUpdated") return v;
    }
  }

  return "";
}

/* ---------------- component ---------------- */

export default function MessagesSlidesScreen() {
  const settings = useSettings();
  usePrayerTimes(); // keep data layer consistent (even if panel is slide-only)
  const settingsMap = useMemo(() => buildSettingsMap(settings), [settings]);

  // Display Mode (same approach as slideshow so text scaling stays consistent)
  const [displayMode, setDisplayMode] = useLocalDisplayMode("1080p");
  useEffect(() => {
    const root = document.documentElement;
    const prior = Array.from(root.classList).filter((c) => c.startsWith("mode-"));
    prior.forEach((c) => root.classList.remove(c));
    root.classList.add(`mode-${displayMode}`);
    return () => root.classList.remove(`mode-${displayMode}`);
  }, [displayMode]);

  // Device code + remote overrides (optional, but keeps consistent with slideshow behaviour)
  const { code: deviceCode } = useDeviceId();
  const DEVICE_API = import.meta.env.VITE_DEVICE_API || "";
  const { cfg: remoteCfg } = useRemoteDeviceConfig(deviceCode, DEVICE_API, 15000);

  useEffect(() => {
    if (!remoteCfg) return;
    if (String(remoteCfg.enabled ?? "TRUE").toUpperCase() === "FALSE") return;
    if (remoteCfg.displayMode) setDisplayMode(remoteCfg.displayMode);
  }, [remoteCfg, setDisplayMode]);

  // Theme group for slideshow panel
  const activeTheme = settingsMap["toggles.theme"] || "Theme_1";
  const base = `theme.${activeTheme}`;
  const themeSlideshow = useMemo(
    () => readGroup(settingsMap, `${base}.slideshow`),
    [settingsMap, base]
  );

  // Auto-reload when sheet changes (same as slideshow)
  const lastUpdatedRef = useRef("");
  const lastHardReloadRef = useRef(Date.now());

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        const r = await fetch(getSettingsUrl(), { cache: "no-store" });
        const j = await r.json();
        const rows = Array.isArray(j) ? j : (j.rows || j.values || j.settings || []);
        const next = extractLastUpdatedFromSettingsRows(rows);

        if (!lastUpdatedRef.current) {
          lastUpdatedRef.current = next || "";
          return;
        }

        if (next && next !== lastUpdatedRef.current) {
          window.location.reload();
          return;
        }

        if (Date.now() - lastHardReloadRef.current > 30 * 60 * 1000) {
          lastHardReloadRef.current = Date.now();
          window.location.reload();
        }
      } catch {
        // ignore transient failures
      }
    };

    poll();
    const id = setInterval(() => !stopped && poll(), 60 * 1000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  const now = moment();

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden">
      <SlideshowPanel
        settings={settings}
        now={now}
        settingsMap={settingsMap}
        theme={themeSlideshow}
      />
    </div>
  );
}