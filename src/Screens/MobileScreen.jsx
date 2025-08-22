// src/Screens/MobileScreen.jsx

import "../index.css";
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";

import usePrayerTimes from "../hooks/usePrayerTimes";
import useSettings from "../hooks/useSettings";
import { getEnglishLabels, getArabicLabels } from "../utils/labels";
import useMobileTimeline from "../hooks/useMobileTimeline";

import MobileCurrentCard from "../Components/MobileCurrentCard";
import MobileNextCard from "../Components/MobileNextCard";
import MobileUpcomingList from "../Components/MobileUpcomingList";

/* ------------------------------------------------------------------ */
/* Install prompt hook (reads deferred event saved early in main.jsx)  */
/* ------------------------------------------------------------------ */
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // pick up any deferred event captured before React mounted
    setPromptEvent(window.__deferredInstallPrompt || null);

    const onPrompt = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setPromptEvent(e);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const inStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator && window.navigator.standalone);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  const install = async () => {
    const ev = promptEvent || window.__deferredInstallPrompt;
    if (ev && typeof ev.prompt === "function") {
      ev.prompt();
      const choice = await ev.userChoice;
      window.__deferredInstallPrompt = null;
      setPromptEvent(null);
      return choice?.outcome === "accepted";
    }
    // Fallback instructions (for iOS / no event)
    alert(
      isIOS
        ? "On iPhone/iPad: tap the Share icon, then ‘Add to Home Screen’."
        : "Use your browser’s menu and choose ‘Install app’ (or the plus icon)."
    );
    return false;
  };

  // show button if not installed and (have event OR on iOS which uses A2HS)
  const canInstall = !inStandalone && (!!(promptEvent || window.__deferredInstallPrompt) || isIOS);

  return { canInstall, install, installed, inStandalone, isIOS, isAndroid, isDesktop };
}

/* ------------------------------------------------------------------ */
/* Web Push subscribe/unsubscribe (expects /api/push endpoints)        */
/* ------------------------------------------------------------------ */
const VAPID_PUBLIC = (import.meta?.env?.VITE_VAPID_PUBLIC_KEY || "").trim(); // base64url

function b64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported on this browser.");
  }
  if (!VAPID_PUBLIC) {
    throw new Error("Missing VAPID public key (VITE_VAPID_PUBLIC_KEY).");
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications permission was denied.");

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64UrlToUint8Array(VAPID_PUBLIC),
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  return sub;
}

async function unsubscribeFromPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } finally {
    await sub.unsubscribe();
  }
}

function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const reg = await navigator.serviceWorker?.ready;
        const sub = await reg?.pushManager?.getSubscription?.();
        if (mounted) setEnabled(!!sub);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onToggle = async () => {
    setLoading(true);
    setError("");
    try {
      if (!enabled) {
        await subscribeToPush();
        setEnabled(true);
      } else {
        await unsubscribeFromPush();
        setEnabled(false);
      }
    } catch (e) {
      setError(e?.message || "Failed to change notifications.");
    } finally {
      setLoading(false);
    }
  };

  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  if (!supported) return null;

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        disabled={loading}
        className={`w-full rounded-xl border px-3 py-2 text-[15px] font-semibold transition ${
          enabled
            ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
            : "border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15"
        }`}
      >
        {loading ? "Please wait…" : enabled ? "Disable notifications" : "Enable notifications"}
      </button>
      {!!error && <div className="mt-1 text-sm text-red-300">{error}</div>}
    </div>
  );
}

/* --------------------------- UI atoms --------------------------- */
const Pill = ({ left, right, className = "" }) => (
  <div
    className={[
      "flex items-center justify-between",
      "rounded-xl border border-white/15 bg-white/10",
      "px-3 py-2 text-[15px] leading-none",
      className,
    ].join(" ")}
  >
    <span className="font-semibold truncate">{left}</span>
    <span className="opacity-90 ml-3">{right}</span>
  </div>
);

// Small banner with platform-specific install hints
function InstallHintBanner({ isIOS, isAndroid, isDesktop }) {
  let text = "";
  if (isIOS) {
    text = "Tip: On iPhone/iPad, tap the Share icon, then ‘Add to Home Screen’.";
  } else if (isAndroid) {
    text = "Tip: Use the browser menu and choose ‘Install app’ or ‘Add to Home screen’.";
  } else if (isDesktop) {
    text = "Tip: In your browser menu, choose ‘Install app’ (or click the install icon).";
  } else {
    return null;
  }

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] leading-snug text-white/90">
      {text}
    </div>
  );
}

/* --------------------------- helpers ---------------------------- */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
const fmt = (d, hour12 = false) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12,
        timeZone: tz,
      }).format(d)
    : "—";

const pad2 = (n) => String(n).padStart(2, "0");

const flattenSettings = (rows) => {
  const map = {};
  (rows || []).forEach((r) => {
    const g = (r?.Group || "").trim();
    const k = (r?.Key || "").trim();
    const v = r?.Value != null ? String(r.Value).trim() : "";
    if (!k || v === "") return;
    map[k] = v;
    if (g) map[`${g}.${k}`] = v;
  });
  return map;
};

function findRowForDate(rows, date = new Date()) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const d = date.getDate(),
    m = date.getMonth() + 1,
    y = date.getFullYear();
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  const dmySlash = `${pad2(d)}/${pad2(m)}/${y}`;
  const dmyDash = `${pad2(d)}-${pad2(m)}-${y}`;

  for (const r of rows) {
    const dayVal = r.Day ?? r.day ?? r["Day "];
    const monthVal = r.Month ?? r.month;
    if (dayVal && monthVal) {
      if (parseInt(dayVal, 10) === d && parseInt(monthVal, 10) === m) return r;
    }
    if (r.Date || r.date) {
      const v = String(r.Date || r.date).trim();
      if (v === iso || v === dmySlash || v === dmyDash) return r;
    }
  }
  return null;
}

/* ============================= Component ============================= */
export default function MobileScreen() {
  const [hb, setHb] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHb((h) => h + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const timetable = usePrayerTimes();
  const settingsRows = useSettings();

  const settingsMap = useMemo(() => flattenSettings(settingsRows), [settingsRows]);
  const labels = useMemo(() => getEnglishLabels(settingsMap), [settingsMap]);
  const arabic = useMemo(() => getArabicLabels(settingsMap), [settingsMap]);

  const now = useMemo(() => new Date(), [hb]);
  const refToday = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const refTomorrow = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() + 1);
    return d;
  }, [refToday]);
  const refYesterday = useMemo(() => {
    const d = new Date(refToday);
    d.setDate(refToday.getDate() - 1);
    return d;
  }, [refToday]);

  const todayRow = useMemo(() => findRowForDate(timetable, refToday), [timetable, refToday]);
  const yRow = useMemo(() => findRowForDate(timetable, refYesterday), [timetable, refYesterday]);
  const tRow = useMemo(() => findRowForDate(timetable, refTomorrow), [timetable, refTomorrow]);

  const is24Hour =
    (settingsMap["toggles.clock24Hours"] || settingsMap["clock24Hours"] || "")
      .toString()
      .toUpperCase() === "TRUE";

  // Use shared hook (handles Fajr/Shouruq + Jummah)
  const { upcoming } = useMobileTimeline({
    now: useMemo(() => moment(now), [now]),
    todayRow,
    tomorrowRow: tRow,
    yesterdayRow: yRow,
    settingsMap,
    numberToShow: 6,
  });

  const todayLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: tz,
  }).format(now);
  const nowStr = fmt(now, !is24Hour);

  // Install button state
  const { canInstall, install, installed, inStandalone, isIOS, isAndroid, isDesktop } =
    useInstallPrompt();

  return (
    <div className="min-h-screen bg-[#060a12] text-white font-poppins md:flex md:items-center md:justify-center md:p-6">
      <div className="w-full md:max-w-[420px] md:rounded-[28px] md:border md:border-white/10 md:bg-[#0b0f1a] md:shadow-2xl md:overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 bg-[#0b0f1a]">
          <div className="text-lg font-semibold truncate">Greenbank Masjid - Prayer times</div>
          <div className="text-xs opacity-75">Mobile view</div>
        </div>

        <main className="px-4 py-4 space-y-3">
          <Pill left={todayLong} right={nowStr} />

          {canInstall && !installed && (
            <button
              onClick={install}
              className="w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[15px] font-semibold text-emerald-300 hover:bg-emerald-400/15"
            >
              Install app
            </button>
          )}

          {/* If we can't show the install button, show a gentle hint instead */}
          {!canInstall && !installed && !inStandalone && (
            <InstallHintBanner isIOS={isIOS} isAndroid={isAndroid} isDesktop={isDesktop} />
          )}

          <PushToggle />

          <MobileCurrentCard
            labels={labels}
            arabicLabels={arabic}
            is24Hour={is24Hour}
            todayRow={todayRow}
            yesterdayRow={yRow}
            settingsMap={settingsMap}
          />

          <MobileNextCard
            todayRow={todayRow}
            tomorrowRow={tRow}
            labels={labels}
            arabicLabels={arabic}
            settingsMap={settingsMap}
          />

          <MobileUpcomingList
            upcoming={upcoming}
            is24Hour={is24Hour}
            todayRef={refToday}
            tomorrowRef={refTomorrow}
          />
        </main>
      </div>
    </div>
  );
}
