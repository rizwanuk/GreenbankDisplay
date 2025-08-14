import React, { memo, useEffect, useMemo, useState } from "react";
import moment from "moment";
import useNow from "../hooks/useNow";

function InfoCard({ settings, settingsMap, theme }) {
  const now = useNow(1000); // 1s tick for timely overrides/rotation
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessage, setVisibleMessage] = useState("");
  const [isInOverridePeriod, setIsInOverridePeriod] = useState(false);

  // Theme prefix for this card (backward compatible)
  const themePrefix = theme?.name
    ? `theme.${theme.name}.infoCard.`
    : "theme.default.infoCard.";

  const rotateInterval =
    parseInt(settingsMap?.[`${themePrefix}rotateInterval`] || "10", 10) * 1000;

  const overrideMessage = settingsMap?.[`${themePrefix}overrideMessage`] || "";
  const overrideDurationMs =
    parseInt(settingsMap?.[`${themePrefix}overrideDuration`] || "300", 10) * 1000;

  // Active messages from settings (respect time windows)
  const activeMessages = useMemo(() => {
    return settings
      .filter((row) => row.Group === "infoCardMessages")
      .map((row) => {
        try {
          const parsed = JSON.parse(row.Value);
          return {
            message: parsed.message,
            start: moment(parsed.start),
            end: moment(parsed.end),
          };
        } catch {
          return null;
        }
      })
      .filter((msg) => msg && now.isSameOrAfter(msg.start) && now.isBefore(msg.end));
  }, [settings, now]);

  // Helper to read a keyed HH:mm time as today’s moment
  const toTodayMoment = (raw) =>
    raw
      ? moment(raw, "HH:mm").set({
          year: now.year(),
          month: now.month(),
          date: now.date(),
        })
      : null;

  // Detect if we’re inside any Jama‘ah override window
  useEffect(() => {
    const fajr = toTodayMoment(
      settingsMap?.["Fajr Iqamah"] ||
        settingsMap?.["fajr iqamah"] ||
        settingsMap?.["Fajr Iqama"]
    );
    const dhuhr = toTodayMoment(
      settingsMap?.["Dhuhr Iqamah"] ||
        settingsMap?.["dhuhr iqamah"] ||
        settingsMap?.["Dhuhr Iqama"]
    );
    const asr = toTodayMoment(
      settingsMap?.["Asr Iqamah"] ||
        settingsMap?.["asr iqamah"] ||
        settingsMap?.["Asr Iqama"]
    );
    const maghrib = toTodayMoment(
      settingsMap?.["Maghrib Iqamah"] ||
        settingsMap?.["maghrib iqamah"] ||
        settingsMap?.["Maghrib Iqama"]
    );
    const isha = toTodayMoment(
      settingsMap?.["Isha Iqamah"] ||
        settingsMap?.["isha iqamah"] ||
        settingsMap?.["Isha Iqama"]
    );

    const windows = [fajr, dhuhr, asr, maghrib, isha]
      .filter(Boolean)
      .map((t) => ({ start: t, end: t.clone().add(overrideDurationMs, "ms") }));

    const inOverride = windows.some(
      ({ start, end }) => now.isSameOrAfter(start) && now.isBefore(end)
    );

    setIsInOverridePeriod(inOverride);
  }, [now, settingsMap, overrideDurationMs]);

  // Rotate messages or show override
  useEffect(() => {
    if (isInOverridePeriod || activeMessages.length === 0) {
      setVisibleMessage(overrideMessage || "");
      return;
    }

    setVisibleMessage(activeMessages[currentMessageIndex]?.message || "");

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % activeMessages.length);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [currentMessageIndex, rotateInterval, isInOverridePeriod, activeMessages, overrideMessage]);

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

const areEqual = (p, n) =>
  p.theme === n.theme &&
  p.settingsMap === n.settingsMap &&
  p.settings === n.settings;

export default memo(InfoCard, areEqual);
