import React, { useEffect, useMemo, useState } from "react";
import moment from "moment-hijri";
import useNow from "../hooks/useNow";
import usePrayerTimes from "../hooks/usePrayerTimes";

export default function InfoCard({ settings = [], settingsMap = {}, theme = {} }) {
  const now = useNow(1000);           // tick every second
  const timetable = usePrayerTimes(); // preferred source for today's Jama'ah

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessage, setVisibleMessage] = useState("");
  const [isInOverridePeriod, setIsInOverridePeriod] = useState(false);

  // ---------- SETTINGS (global first, then theme.<current>, then theme.default) ----------
  const themeName = settingsMap?.["toggles.theme"];

  const pick = (keys, def = undefined) => {
    for (const k of keys) {
      if (!k) continue;
      const v = settingsMap?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return def;
  };

  const themePrefix = theme?.name
    ? `theme.${theme.name}.infoCard.`
    : themeName
    ? `theme.${themeName}.infoCard.`
    : "theme.default.infoCard.";

  const rotateIntervalMs = (() => {
    const s = pick(["infoCard.rotateInterval", `${themePrefix}rotateInterval`], "10");
    const n = parseInt(s, 10);
    return (Number.isFinite(n) && n > 0 ? n : 10) * 1000;
  })();

  const overrideMessage = pick(
    ["infoCard.overrideMessage", `${themePrefix}overrideMessage`],
    ""
  );

  const overrideDurationMs = (() => {
    const s = pick(["infoCard.overrideDuration", `${themePrefix}overrideDuration`], "300");
    const n = parseInt(s, 10);
    return (Number.isFinite(n) && n >= 0 ? n : 300) * 1000;
  })();

  // ---------- ACTIVE SCHEDULED MESSAGES (Group: infoCardMessages) ----------
  const activeMessages = useMemo(() => {
    const list = (settings || [])
      .filter((row) => row?.Group === "infoCardMessages" && row?.Value)
      .map((row) => {
        try {
          const parsed = JSON.parse(row.Value);
          const message = String(parsed?.message ?? "").trim();
          const start = parsed?.start ? moment(parsed.start) : null;
          const end = parsed?.end ? moment(parsed.end) : null;
          return { message, start, end };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const nowTs = typeof now?.valueOf === "function" ? now.valueOf() : Date.now();
    return list.filter(({ message, start, end }) => {
      if (!message) return false;
      const okStart = !start || nowTs >= start.valueOf();
      const okEnd = !end || nowTs <= end.valueOf();
      return okStart && okEnd;
    });
  }, [settings, now]);

  // ---------- Robust time parsing helper (locale=null, strict=true) ----------
  const parseTodayTime = (hhmmLike) => {
    if (!hhmmLike) return null;
    const normalized = String(hhmmLike)
      .trim()
      .replace(/[：﹕︓]/g, ":")
      .replace(/[．。]/g, ".")
      .replace(/\s+/g, " ");
    const baseDate = (typeof now?.format === "function" ? now : moment()).format("YYYY-MM-DD");
    const m = moment(
      `${baseDate} ${normalized}`,
      [
        "YYYY-MM-DD HH:mm",
        "YYYY-MM-DD H:mm",
        "YYYY-MM-DD hh:mm A",
        "YYYY-MM-DD h:mm A",
        "YYYY-MM-DD hh:mmA",
        "YYYY-MM-DD h:mma",
        "YYYY-MM-DD HH.mm",
        "YYYY-MM-DD H.mm",
        "YYYY-MM-DD h.mm a",
        "YYYY-MM-DD hh.mm a",
      ],
      null, // locale
      true  // strict
    );
    return m.isValid()
      ? m.set({ year: (typeof now?.year === "function" ? now.year() : moment().year()),
                month: (typeof now?.month === "function" ? now.month() : moment().month()),
                date: (typeof now?.date === "function" ? now.date() : moment().date()) })
      : null;
  };

  // ---------- Today's row from timetable (preferred) ----------
  const todayRow = useMemo(() => {
    if (!Array.isArray(timetable)) return null;
    const m = typeof now?.date === "function" ? now : moment();
    return timetable.find(
      (r) => parseInt(r?.Day, 10) === m.date() && parseInt(r?.Month, 10) === m.month() + 1
    );
  }, [timetable, now]);

  // Jummah replacement time from sheet: Group jummahTimes, Key <MonthName>
  const jummahMoment = useMemo(() => {
    const dayName = (typeof now?.format === "function" ? now.format("dddd") : moment().format("dddd"));
    if (dayName !== "Friday") return null;
    const monthName = (typeof now?.format === "function" ? now.format("MMMM") : moment().format("MMMM"));
    const value = settingsMap?.[`jummahTimes.${monthName}`];
    const m = parseTodayTime(value);
    return m && m.isValid() ? m : null;
  }, [now, settingsMap]);

  // Build Jama'ah list: prefer timetable, fallback to settingsMap if needed
  const jamaahTimes = useMemo(() => {
    const times = [];

    if (todayRow) {
      const fajr = parseTodayTime(todayRow["Fajr Iqamah"]);
      const dayName = (typeof now?.format === "function" ? now.format("dddd") : moment().format("dddd"));
      const dhuhr =
        dayName === "Friday"
          ? (jummahMoment || parseTodayTime(todayRow["Dhuhr Iqamah"]))
          : parseTodayTime(todayRow["Dhuhr Iqamah"]);
      const asr = parseTodayTime(todayRow["Asr Iqamah"]);
      const maghrib = parseTodayTime(todayRow["Maghrib Iqamah"]);
      const isha = parseTodayTime(todayRow["Isha Iqamah"]);
      [fajr, dhuhr, asr, maghrib, isha].forEach((t) => t && t.isValid() && times.push(t));
    } else {
      // Fallback (keeps old behaviour if timetable is missing)
      const keys = ["Fajr Iqamah", "Dhuhr Iqamah", "Asr Iqamah", "Maghrib Iqamah", "Isha Iqamah"];
      keys.forEach((k) => {
        const raw = settingsMap?.[k] || settingsMap?.[k?.toLowerCase?.()];
        const t = parseTodayTime(raw);
        if (t && t.isValid()) times.push(t);
      });
    }

    // ✅ Only consider times that are on *today’s* date to avoid cross-day glitches
    const today = (typeof now?.startOf === "function" ? now.clone().startOf("day") : moment().startOf("day"));
    return times.filter((t) => t.isSame(today, "day"));
  }, [todayRow, now, settingsMap, jummahMoment]);

  // ---------- Compute override window using plain timestamps ----------
  useEffect(() => {
    if (!overrideMessage || overrideDurationMs <= 0 || jamaahTimes.length === 0) {
      setIsInOverridePeriod(false);
      return;
    }

    const nowTs = typeof now?.valueOf === "function" ? now.valueOf() : Date.now();
    const active = jamaahTimes.some((t) => {
      const start = t.valueOf();
      const end = start + overrideDurationMs;
      return nowTs >= start && nowTs < end;
    });

    setIsInOverridePeriod(active);
  }, [now, jamaahTimes, overrideMessage, overrideDurationMs]);

  // ---------- Rotation / Display ----------
  useEffect(() => {
    if (isInOverridePeriod) {
      setVisibleMessage(overrideMessage || "");
      return;
    }
    if (activeMessages.length === 0) {
      setVisibleMessage(""); // nothing to show (no override, no active messages)
      return;
    }

    setVisibleMessage(activeMessages[currentMessageIndex]?.message || "");

    const id = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % activeMessages.length);
    }, rotateIntervalMs);

    return () => clearInterval(id);
  }, [currentMessageIndex, rotateIntervalMs, isInOverridePeriod, activeMessages, overrideMessage]);

  if (!visibleMessage) return null;

  return (
    <div
      className={`w-full px-4 py-6 text-center rounded-xl ${
        theme?.bgColor || "bg-white/10"
      } ${theme?.textColor || "text-white"} backdrop-blur-sm`}
    >
      <div className="mb-3">
        <span className="px-4 py-1 rounded-full text-sm sm:text-base font-medium tracking-wide bg-white/10 text-white border border-white/20 backdrop-blur-sm">
          Info
        </span>
      </div>

      <div
        className={`px-2 text-center ${
          theme?.fontEng || "font-rubik"
        } ${theme?.textSize || "text-2xl sm:text-3xl md:text-4xl"} font-medium tracking-wide leading-tight max-w-full whitespace-normal break-words`}
      >
        {visibleMessage}
      </div>
    </div>
  );
}
