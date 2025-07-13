import moment from "moment";

export function buildPrayerTimeline({ today, tomorrow, yesterday, settingsMap }) {
  const prayers = [];
  const ishraqOffset = parseInt(settingsMap["timings.showIshraq"], 10) || 30;

  const parseTime = (value, baseDate) => {
    if (!value) return null;
    const t = moment(value, "HH:mm");
    return baseDate.clone().hour(t.hour()).minute(t.minute()).second(0);
  };

  const addPrayer = (row, label, date) => {
    prayers.push({
      name: label,
      start: parseTime(row[`${label} Adhan`] || row[label], date),
      jamaah: parseTime(row[`${label} Iqamah`], date),
    });
  };

  const addSpecials = (row, date) => {
    const sunrise = parseTime(row["Shouruq"], date);
    prayers.push({ name: "Sunrise", start: sunrise });
    if (sunrise) {
      prayers.push({
        name: "Ishraq",
        start: sunrise.clone().add(ishraqOffset, "minutes"),
      });
    }
  };

  const todayDate = moment();
  const tomorrowDate = moment().add(1, "day");
  const yesterdayDate = moment().subtract(1, "day");

  if (yesterday) {
    addPrayer(yesterday, "Isha", yesterdayDate);
  }

  if (today) {
    addPrayer(today, "Fajr", todayDate);
    addSpecials(today, todayDate);
    ["Dhuhr", "Asr", "Maghrib", "Isha"].forEach((p) => addPrayer(today, p, todayDate));
  }

  if (tomorrow) {
    addPrayer(tomorrow, "Fajr", tomorrowDate);
    addSpecials(tomorrow, tomorrowDate);
    ["Dhuhr", "Asr", "Maghrib", "Isha"].forEach((p) => addPrayer(tomorrow, p, tomorrowDate));
  }

  return prayers
    .filter((p) => p.start)
    .sort((a, b) => a.start.diff(b.start));
}

export default function getCurrentPrayer({ today, tomorrow, yesterday, settingsMap }) {
  const timeline = buildPrayerTimeline({ today, tomorrow, yesterday, settingsMap });
  const now = moment();

  let current = null;
  let next = null;

  for (let i = 0; i < timeline.length; i++) {
    const slot = timeline[i];
    const nextSlot = timeline[i + 1];

    if (now.isSameOrAfter(slot.start) && (!nextSlot || now.isBefore(nextSlot.start))) {
      current = slot;
      next = nextSlot || timeline[0];
      break;
    }
  }

  if (!current) {
    current = timeline[timeline.length - 1];
    next = timeline[0];
  }

  return {
    currentPrayer: current,
    nextPrayer: next,
  };
}
