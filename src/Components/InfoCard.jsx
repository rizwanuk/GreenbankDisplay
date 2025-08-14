import React, { useEffect, useState } from "react";
import moment from "moment-hijri";
import useNow from "../hooks/useNow";

export default function InfoCard({ settings, settingsMap, theme }) {
  const now = useNow(1000);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [visibleMessage, setVisibleMessage] = useState("");
  const [isInOverridePeriod, setIsInOverridePeriod] = useState(false);

  const themePrefix = theme?.name
    ? `theme.${theme.name}.infoCard.`
    : "theme.default.infoCard.";

  const rotateInterval =
    parseInt(settingsMap?.[`${themePrefix}rotateInterval`] || "10", 10) * 1000;
  const overrideMessage = settingsMap?.[`${themePrefix}overrideMessage`] || "";
  const overrideDurationMs =
    parseInt(settingsMap?.[`${themePrefix}overrideDuration`] || "300", 10) * 1000;

  const activeMessages = (settings || [])
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

  const getTime = (key) => {
    const raw =
      settingsMap?.[key] ||
      settingsMap?.[key?.toLowerCase?.()] ||
      settingsMap?.[key?.replace?.("Iqamah", "Iqama")] ||
      null;

    if (!raw) return null;

    return moment(raw, "HH:mm").set({
      year: now.year(),
      month: now.month(),
      date: now.date(),
    });
  };

  useEffect(() => {
    const jamaahTimes = [
      getTime("Fajr Iqamah"),
      getTime("Dhuhr Iqamah"),
      getTime("Asr Iqamah"),
      getTime("Maghrib Iqamah"),
      getTime("Isha Iqamah"),
    ].filter(Boolean);

    const inOverride = jamaahTimes.some(
      (time) => now.isSameOrAfter(time) && now.isBefore(time.clone().add(overrideDurationMs, "ms"))
    );

    setIsInOverridePeriod(inOverride);
  }, [now, settingsMap, overrideDurationMs]);

  useEffect(() => {
    if (isInOverridePeriod || activeMessages.length === 0) {
      setVisibleMessage(overrideMessage || "");
      return;
    }

    setVisibleMessage(activeMessages[currentMessageIndex]?.message || "");

    const id = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % activeMessages.length);
    }, rotateInterval);

    return () => clearInterval(id);
  }, [currentMessageIndex, rotateInterval, isInOverridePeriod, activeMessages.length, overrideMessage]);

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
