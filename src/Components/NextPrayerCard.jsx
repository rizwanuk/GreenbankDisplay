import React, { useEffect, useState } from "react";
import moment from "moment";

export default function NextPrayerCard({
  todayRow,
  tomorrowRow,
  isFriday,
  labels,
  arabicLabels,
  settingsMap,
  theme,
}) {
  const [now, setNow] = useState(moment());
  const [countdown, setCountdown] = useState("");
  const [nextLabel, setNextLabel] = useState("");
  const [nextArabic, setNextArabic] = useState("");
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!todayRow || !tomorrowRow) return;

    const highlightMinutes = parseInt(settingsMap["timings.jamaahHighlightDuration"] || "5", 10);
    const ishraqOffset = parseInt(settingsMap["timings.ishraqAfterSunrise"] || "10", 10);
    const ishraqDuration = parseInt(settingsMap["timings.ishraqDuration"] || "30", 10);
    const jummahTime = settingsMap[`timings.jummah.${now.month() + 1}`];

    const buildPrayerList = () => {
      const prayers = [];

      const add = (label, base, date, overrideLabel, overrideArabic, overrideJamaah) => {
        const adhan = base[`${label} Adhan`] || base[label];
        const jamaah = overrideJamaah || base[`${label} Iqamah`];
        if (!adhan || !jamaah) return;

        const start = moment(adhan, "HH:mm").set({
          year: date.year(),
          month: date.month(),
          date: date.date(),
        });
        const jam = moment(jamaah, "HH:mm").set({
          year: date.year(),
          month: date.month(),
          date: date.date(),
        });

        const key = label.toLowerCase();
        prayers.push({
          key,
          label: overrideLabel || labels[key],
          arabic: overrideArabic || arabicLabels[key],
          start,
          jamaah: jam,
        });
      };

      const today = now.clone();
      const tomorrow = today.clone().add(1, "day");

      add("Fajr", todayRow, today);
      if (isFriday) {
        add("Dhuhr", todayRow, today, labels.jummah, arabicLabels.jummah, jummahTime);
      } else {
        add("Dhuhr", todayRow, today);
      }
      add("Asr", todayRow, today);
      add("Maghrib", todayRow, today);
      add("Isha", todayRow, today);
      add("Fajr", tomorrowRow, tomorrow);

      // Add Ishraq
      const fajrStartRaw = todayRow["Fajr Adhan"] || todayRow["Fajr"];
      const sunriseRaw = todayRow["Shouruq"];
      if (fajrStartRaw && sunriseRaw) {
        const fajrStart = moment(fajrStartRaw, "HH:mm").set({
          year: today.year(),
          month: today.month(),
          date: today.date(),
        });
        const sunrise = moment(sunriseRaw, "HH:mm").set({
          year: today.year(),
          month: today.month(),
          date: today.date(),
        });
        const ishraqStart = sunrise.clone().add(ishraqOffset, "minutes");
        const ishraqEnd = ishraqStart.clone().add(ishraqDuration, "minutes");

        prayers.push({
          key: "ishraq",
          label: labels.ishraq || "Ishraq",
          arabic: arabicLabels.ishraq || "الإشراق",
          start: ishraqStart,
          jamaah: ishraqStart,
          end: ishraqEnd,
        });
      }

      return prayers;
    };

    const update = () => {
      const list = buildPrayerList();
      if (!list || list.length === 0) return;

      const upcoming = list
        .filter((p) => now.isSameOrBefore(p.start))
        .sort((a, b) => a.start.diff(b.start))[0];

      if (!upcoming) {
        setNextLabel("");
        setNextArabic("");
        setCountdown("No upcoming prayer");
        return;
      }

      setNextLabel(upcoming.label || "");
      setNextArabic(upcoming.arabic || "");

      const duringJamaah =
        now.isSameOrAfter(upcoming.jamaah) &&
        now.isBefore(upcoming.jamaah.clone().add(highlightMinutes, "minutes"));

      let display = "";
      if (duringJamaah) {
        return;
      } else {
        const target = now.isBefore(upcoming.start) ? upcoming.start : upcoming.jamaah;
        const prefix = now.isBefore(upcoming.start) ? "Begins in" : "Jama‘ah in";

        const diff = moment.duration(target.diff(now));
        const seconds = Math.floor(diff.asSeconds());

        if (seconds < 120) {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          const minPart = mins > 0 ? `${mins}m ` : "";
          const secPart = `${secs}s`;
          display = `${prefix} ${minPart}${secPart}`;
        } else {
          const totalMinutes = Math.ceil(diff.asMinutes());
          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;

          if (hours > 0 && mins > 0) {
            display = `${prefix} ${hours}h ${mins}m`;
          } else if (hours > 0) {
            display = `${prefix} ${hours} hour${hours !== 1 ? "s" : ""}`;
          } else {
            display = `${prefix} ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
          }
        }

        setInProgress(false);
        setCountdown(display);
      }
    };

    update();
  }, [now, todayRow, tomorrowRow, settingsMap, labels, arabicLabels, isFriday]);

  if (!todayRow || !tomorrowRow) return null;

  return (
    <div
      className={`w-full px-4 py-6 text-center rounded-xl ${
        inProgress ? theme?.jamaahColor || "bg-green-700" : theme?.bgColor || "bg-white/5"
      }`}
    >
      <div className="flex items-center gap-4 flex-wrap justify-center mb-4">
        {nextLabel && (
          <span
            className={`${theme?.nameSize || "text-6xl sm:text-7xl md:text-8xl"} ${
              theme?.fontEng || "font-rubik"
            } font-semibold flex-shrink-0`}
          >
            {nextLabel}
          </span>
        )}
        {nextArabic && (
          <span
            className={`${theme?.nameSizeArabic || "text-5xl sm:text-6xl md:text-7xl"} ${
              theme?.fontAra || "font-arabic"
            } flex-shrink-0`}
          >
            {nextArabic}
          </span>
        )}
        <span
          className={`ml-2 px-4 py-1 rounded-full text-base sm:text-xl md:text-2xl font-medium tracking-wide backdrop-blur-sm border border-white/20 ${
            theme?.badgeColor || "bg-white/10 text-white"
          } max-w-full sm:max-w-none`}
        >
          Next
        </span>
      </div>

      <div
        className={`${theme?.countdownSize || "text-3xl md:text-5xl"} ${
          theme?.textColor || "text-white/80"
        } ${theme?.fontEng || "font-rubik"}`}
      >
        {countdown}
      </div>
    </div>
  );
}
