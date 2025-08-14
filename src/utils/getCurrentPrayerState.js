import moment from "moment";
import { getJummahTime } from "../hooks/usePrayerHelpers";

// helpers
const isTime = (m) => !!m && moment.isMoment(m) && m.isValid();
const safeInt = (v, def = 0) => {
  const n = parseInt(v ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
};
const parseOn = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const m = moment(`${dateStr} ${timeStr}`, "YYYY-MM-DD HH:mm", true);
  return m.isValid() ? m : null;
};

/**
 * Returns: { key, label, arabic, start, jamaah, end, isMakrooh, inJamaah }
 */
export function getCurrentPrayerState({
  now = moment(),
  todayRow,
  yesterdayRow,
  settings,
  labels = {},
  arabicLabels = {},
}) {
  if (!todayRow || !settings) {
    return { key: "none", label: "", arabic: "", start: null, jamaah: null, end: null, isMakrooh: false, inJamaah: false };
  }

  const todayStr = now.format("YYYY-MM-DD");
  const yestStr  = now.clone().subtract(1, "day").format("YYYY-MM-DD");
  const getToday = (k) => parseOn(todayStr, todayRow?.[k]);
  const getYest  = (k) => parseOn(yestStr,  yesterdayRow?.[k]);

  const fajrStart     = getToday("Fajr Adhan");
  const fajrJamaah    = getToday("Fajr Iqamah");
  const sunrise       = getToday("Shouruq");
  const dhuhrStart    = getToday("Dhuhr Adhan");
  const dhuhrJamaah   = getToday("Dhuhr Iqamah");
  const asrStart      = getToday("Asr Adhan");
  const asrJamaah     = getToday("Asr Iqamah");
  const maghribStart  = getToday("Maghrib Adhan");
  const maghribJamaah = getToday("Maghrib Iqamah");
  const ishaStart     = getToday("Isha Adhan");
  const ishaJamaah    = getToday("Isha Iqamah");

  const eshaFromYesterday       = getYest("Isha Adhan");
  const eshaJamaahFromYesterday = getYest("Isha Iqamah");

  const jamaahDurationMin       = safeInt(settings["timings.jamaahHighlightDuration"], 5);
  const makroohAfterSunriseMin  = safeInt(settings["timings.makroohAfterSunrise"], 10);
  const showIshraqMin           = safeInt(settings["timings.showIshraq"], 30);
  const makroohBeforeZuhrMin    = safeInt(settings["timings.makroohBeforeZuhr"], 10);
  const makroohBeforeMaghribMin = safeInt(settings["timings.makroohBeforeMaghrib"], 10);
  const midnightCutoff          = !!settings["toggles.midnightCutoff"];

  const ishraqStart = isTime(sunrise) ? sunrise.clone().add(makroohAfterSunriseMin, "minutes") : null;
  const ishraqEnd   = isTime(ishraqStart) && showIshraqMin > 0 ? ishraqStart.clone().add(showIshraqMin, "minutes") : null;

  const makBeforeZuhr = isTime(dhuhrStart)   && makroohBeforeZuhrMin    > 0 ? dhuhrStart.clone().subtract(makroohBeforeZuhrMin, "minutes")     : null;
  const makBeforeMag  = isTime(maghribStart) && makroohBeforeMaghribMin > 0 ? maghribStart.clone().subtract(makroohBeforeMaghribMin, "minutes") : null;

  const isFriday = now.format("dddd") === "Friday";
  const jummahMoment = getJummahTime(settings, now);

  let state = { key: "none", label: "", arabic: "", start: null, jamaah: null, end: null, isMakrooh: false, inJamaah: false };
  const set = (key, label, arabic, start = null, jamaah = null, isMakrooh = false, end = null) => {
    state = { key, label, arabic, start, jamaah, end, isMakrooh, inJamaah: false };
  };

  if (isTime(fajrStart) && now.isBefore(fajrStart)) {
    if (midnightCutoff && now.isSameOrAfter(now.clone().startOf("day"))) {
      set("nafl", `Nafl ${arabicLabels?.nafl || "نافلة"} prayers can be offered`, null);
    } else {
      set("isha", labels?.isha, arabicLabels?.isha, eshaFromYesterday, eshaJamaahFromYesterday);
    }

  } else if (isTime(fajrJamaah) && now.isBefore(fajrJamaah)) {
    set("fajr", labels?.fajr, arabicLabels?.fajr, fajrStart, fajrJamaah, false, sunrise);

  } else if (isTime(fajrJamaah) && now.isSameOrAfter(fajrJamaah) && now.isBefore(fajrJamaah.clone().add(jamaahDurationMin, "minutes"))) {
    state = { key: "fajr", label: labels?.fajr, arabic: arabicLabels?.fajr, start: fajrStart, jamaah: fajrJamaah, end: sunrise, isMakrooh: false, inJamaah: true };

  } else if (isTime(sunrise) && now.isBefore(sunrise)) {
    set("fajr", labels?.fajr, arabicLabels?.fajr, fajrStart, fajrJamaah, false, sunrise);

  } else if (isTime(sunrise) && isTime(ishraqStart) && makroohAfterSunriseMin > 0 && ishraqStart.isAfter(sunrise) && now.isSameOrAfter(sunrise) && now.isBefore(ishraqStart)) {
    set("makrooh", `Makrooh ${arabicLabels?.makrooh || "مكروه"} time — please avoid praying`, null, null, null, true, ishraqStart);

  } else if (isTime(ishraqStart) && isTime(ishraqEnd) && ishraqEnd.isAfter(ishraqStart) && now.isSameOrAfter(ishraqStart) && now.isBefore(ishraqEnd)) {
    set("ishraq", `Ishraq ${arabicLabels?.ishraq || "اشراق"}`, null, null, null, false, ishraqEnd);

  } else if (isTime(makBeforeZuhr) && now.isBefore(makBeforeZuhr)) {
    set("nafl", `Nafl ${arabicLabels?.nafl || "نافلة"} prayers can be offered`);

  } else if (isTime(makBeforeZuhr) && isTime(dhuhrStart) && dhuhrStart.isAfter(makBeforeZuhr) && now.isSameOrAfter(makBeforeZuhr) && now.isBefore(dhuhrStart)) {
    set("makrooh", `Makrooh ${arabicLabels?.makrooh || "مكروه"} time — please avoid praying`, null, null, null, true, dhuhrStart);

  } else if (isTime(dhuhrJamaah) && now.isBefore(dhuhrJamaah)) {
    const lbl = isFriday ? (labels?.jummah || "Jum‘ah") : labels?.dhuhr;
    const ara = isFriday ? arabicLabels?.jummah : arabicLabels?.dhuhr;
    set("dhuhr", lbl, ara, dhuhrStart, (isFriday && isTime(jummahMoment)) ? jummahMoment : dhuhrJamaah);

  } else if (isTime(dhuhrJamaah) && now.isSameOrAfter(dhuhrJamaah) && now.isBefore(dhuhrJamaah.clone().add(jamaahDurationMin, "minutes"))) {
    state = { key: isFriday ? "jummah" : "dhuhr", label: isFriday ? (labels?.jummah || "Jum‘ah") : labels?.dhuhr, arabic: isFriday ? arabicLabels?.jummah : arabicLabels?.dhuhr, start: dhuhrStart, jamaah: dhuhrJamaah, end: null, isMakrooh: false, inJamaah: true };

  } else if (isTime(asrStart) && now.isBefore(asrStart)) {
    const lbl = isFriday ? (labels?.jummah || "Jum‘ah") : labels?.dhuhr;
    const ara = isFriday ? arabicLabels?.jummah : arabicLabels?.dhuhr;
    set("dhuhr", lbl, ara, dhuhrStart, (isFriday && isTime(jummahMoment)) ? jummahMoment : dhuhrJamaah);

  } else if (isTime(asrJamaah) && now.isBefore(asrJamaah)) {
    set("asr", labels?.asr, arabicLabels?.asr, asrStart, asrJamaah);

  } else if (isTime(asrJamaah) && now.isSameOrAfter(asrJamaah) && now.isBefore(asrJamaah.clone().add(jamaahDurationMin, "minutes"))) {
    state = { key: "asr", label: labels?.asr, arabic: arabicLabels?.asr, start: asrStart, jamaah: asrJamaah, end: null, isMakrooh: false, inJamaah: true };

  } else if (isTime(makBeforeMag) && isTime(maghribStart) && maghribStart.isAfter(makBeforeMag) && now.isSameOrAfter(makBeforeMag) && now.isBefore(maghribStart)) {
    set("makrooh", `Makrooh ${arabicLabels?.makrooh || "مكروه"} time — please avoid praying`, null, null, null, true, maghribStart);

  } else if (isTime(maghribStart) && now.isBefore(maghribStart)) {
    set("asr", labels?.asr, arabicLabels?.asr, asrStart, asrJamaah);

  } else if (isTime(maghribJamaah) && now.isSameOrAfter(maghribJamaah) && now.isBefore(maghribJamaah.clone().add(jamaahDurationMin, "minutes"))) {
    state = { key: "maghrib", label: labels?.maghrib, arabic: arabicLabels?.maghrib, start: maghribStart, jamaah: maghribJamaah, end: null, isMakrooh: false, inJamaah: true };

  } else if (isTime(ishaStart) && now.isBefore(ishaStart)) {
    set("maghrib", labels?.maghrib, arabicLabels?.maghrib, maghribStart, maghribJamaah);

  } else if (isTime(ishaJamaah) && now.isSameOrAfter(ishaJamaah) && now.isBefore(ishaJamaah.clone().add(jamaahDurationMin, "minutes"))) {
    state = { key: "isha", label: labels?.isha, arabic: arabicLabels?.isha, start: ishaStart, jamaah: ishaJamaah, end: null, isMakrooh: false, inJamaah: true };

  } else {
    if (midnightCutoff && isTime(fajrStart) && now.isBefore(fajrStart)) {
      set("nafl", `Nafl ${arabicLabels?.nafl || "نافلة"} prayers can be offered`);
    } else {
      // optional: you could compute next day's Fajr for end, but not needed for your UI
      set("isha", labels?.isha, arabicLabels?.isha, ishaStart, ishaJamaah);
    }
  }

  return state;
}
