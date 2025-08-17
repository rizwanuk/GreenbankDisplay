// src/Components/MobileNextCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import applyJummahOverride from "../helpers/applyJummahOverride";

const SUNRISE_ALIASES = ["sunrise", "shouruq", "shuruq", "shurooq", "shourouq"];
const DHUHR_ALIASES = ["dhuhr", "zuhr"];

// tolerant: "13:22", "1:22 pm", "1322", 802 (mins), Date -> moment on base day
function toMomentOn(anyTime, baseMoment) {
  if (!anyTime) return null;
  if (anyTime instanceof Date && !isNaN(anyTime)) {
    return moment(baseMoment).set({
      hour: anyTime.getHours(),
      minute: anyTime.getMinutes(),
      second: 0,
      millisecond: 0,
    });
  }
  let h = NaN, m = NaN;
  if (typeof anyTime === "number") {
    if (anyTime < 48 * 60) { h = Math.floor(anyTime / 60); m = anyTime % 60; }
    else { h = Math.floor(anyTime / 100); m = anyTime % 100; }
  } else if (typeof anyTime === "string") {
    const s = anyTime.trim().toLowerCase();
    let mm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s)
          || /^(\d{1,2}):(\d{2})\s*(am|pm)$/.exec(s)
          || /^(\d{2})(\d{2})$/.exec(s);
    if (mm) {
      h = Number(mm[1]); m = Number(mm[2]);
      const ampm = mm[3];
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    }
  }
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return moment(baseMoment).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

function pickKey(row, aliases) {
  const keys = Object.keys(row || {});
  const lower = aliases.map((s) => s.toLowerCase());
  return keys.find((k) => lower.includes(String(k).toLowerCase()));
}

function buildItemsForDay(row, baseMoment, labels, arabicLabels, settingsMap) {
  if (!row) return [];
  const out = [];

  const make = (keyName) => {
    const lk = keyName.toLowerCase();
    const startStr =
      row[`${keyName} Adhan`] ?? row[keyName] ??
      (lk === "dhuhr" && row["Zuhr"]) ?? null;
    const jamaahStr = row[`${keyName} Iqamah`] ?? null;
    if (!startStr) return null;

    let start = toMomentOn(startStr, baseMoment);
    let jamaah = jamaahStr ? toMomentOn(jamaahStr, baseMoment) : null;

    let item = {
      key: lk,
      lookupKey: lk,
      name: keyName,
      start,
      jamaah,
      label: labels?.[lk] ?? keyName,
      arabic: arabicLabels?.[lk] ?? "",
    };
    item = applyJummahOverride(item, settingsMap);
    return item;
  };

  // Fard prayers
  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((n) => {
    const it = make(n);
    if (it?.start?.isValid()) out.push(it);
  });

  // Sunrise → Ishraq (optional)
  const sunriseKey = pickKey(row, SUNRISE_ALIASES);
  if (sunriseKey) {
    const sunrise = toMomentOn(row[sunriseKey], baseMoment);
    if (sunrise?.isValid()) {
      const ishraqOffset = parseInt(settingsMap?.["timings.ishraqAfterSunrise"] || "10", 10);
      const ishraq = sunrise.clone().add(ishraqOffset, "minutes");
      out.push({
        key: "ishraq",
        lookupKey: "ishraq",
        name: "Ishraq",
        start: ishraq,
        jamaah: null,
        label: labels?.ishraq || "Ishraq",
        arabic: arabicLabels?.ishraq || "",
      });
    }
  }

  return out;
}

export default function MobileNextCard({
  todayRow,
  tomorrowRow,
  labels = {},
  arabicLabels = {},
  settingsMap = {},
}) {
  const [tick, setTick] = useState(moment());

  useEffect(() => {
    const id = setInterval(() => setTick(moment()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fake time support (same switch as elsewhere)
  const fakeEnabled = String(settingsMap["toggles.fakeTimeEnabled"] ?? "false").toLowerCase() === "true";
  const fakeTimeStr = settingsMap["toggles.fakeTime"];
  let now = tick;
  if (fakeEnabled && fakeTimeStr) {
    const frozen = moment(`${tick.format("YYYY-MM-DD")} ${fakeTimeStr}`, "YYYY-MM-DD HH:mm", true);
    if (frozen.isValid()) now = frozen;
  }

  const todayBase = now.clone().startOf("day");
  const tomorrowBase = todayBase.clone().add(1, "day");

  const list = useMemo(() => {
    const a = buildItemsForDay(todayRow, todayBase, labels, arabicLabels, settingsMap);
    const b = buildItemsForDay(tomorrowRow, tomorrowBase, labels, arabicLabels, settingsMap);
    return [...a, ...b]
      .filter((p) => p?.start?.isValid())
      .sort((x, y) => x.start.diff(y.start));
  }, [todayRow, tomorrowRow, todayBase, tomorrowBase, labels, arabicLabels, settingsMap]);

  // choose next target: begins in OR jama‘ah in (if between)
  const { nextItem, target, prefix } = useMemo(() => {
    let best = null;
    let bestTarget = null;
    let bestPrefix = "Begins in";

    for (const p of list) {
      if (!p.start) continue;

      if (now.isBefore(p.start)) {
        // not started yet
        if (!bestTarget || p.start.isBefore(bestTarget)) {
          best = p;
          bestTarget = p.start;
          bestPrefix = "Begins in";
        }
      } else if (p.jamaah && now.isBefore(p.jamaah)) {
        // between adhan and jama‘ah
        if (!bestTarget || p.jamaah.isBefore(bestTarget)) {
          best = p;
          bestTarget = p.jamaah;
          bestPrefix = "Jama‘ah in";
        }
      }
    }
    return { nextItem: best, target: bestTarget, prefix: bestPrefix };
  }, [list, now]);

  // countdown string
  const countdown = useMemo(() => {
    if (!target) return "No upcoming prayer";
    const diff = moment.duration(target.diff(now));
    const seconds = Math.max(0, Math.floor(diff.asSeconds()));
    if (seconds < 120) {
      const mins = Math.floor(seconds / 60), secs = seconds % 60;
      return `${prefix} ${mins > 0 ? `${mins}m ` : ""}${secs}s`;
    }
    const totalMinutes = Math.ceil(diff.asMinutes());
    const hours = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${prefix} ${hours}h ${mins}m`;
    if (hours > 0) return `${prefix} ${hours} hour${hours !== 1 ? "s" : ""}`;
    return `${prefix} ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
  }, [target, now, prefix]);

  // UI — match MobileCurrentCard (rounded, border, small badge, compact)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 text-white px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="text-2xl font-semibold">
          {nextItem?.label || "Next"}
        </div>
        {nextItem?.arabic ? (
          <div className="text-xl font-arabic" lang="ar" dir="rtl">
            {nextItem.arabic}
          </div>
        ) : null}
        <span className="inline-block text-[10px] px-2 py-[2px] rounded-full bg-white/10 border border-white/20">
          Next
        </span>
      </div>

      <div className="text-[13px] sm:text-sm opacity-90">{countdown}</div>
    </div>
  );
}
