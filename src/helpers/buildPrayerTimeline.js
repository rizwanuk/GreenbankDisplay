export function buildPrayerTimeline({ today, yesterday, tomorrow, settingsMap }) {
  return [
    {
      key: "fajr",
      adhanKey: "Fajr Adhan",
      jamaahKey: "Fajr Iqamah",
      source: "today",
    },
    {
      key: "sunrise",
      adhanKey: "Shouruq",
      jamaahKey: "Shouruq", // no jamaah, same as adhan
      source: "today",
    },
    {
      key: "dhuhr",
      adhanKey: "Dhuhr Adhan",
      jamaahKey: "Dhuhr Iqamah",
      source: "today",
    },
    {
      key: "asr",
      adhanKey: "Asr Adhan",
      jamaahKey: "Asr Iqamah",
      source: "today",
    },
    {
      key: "maghrib",
      adhanKey: "Maghrib Adhan",
      jamaahKey: "Maghrib Iqamah",
      source: "today",
    },
    {
      key: "isha",
      adhanKey: "Isha Adhan",
      jamaahKey: "Isha Iqamah",
      source: "today",
    },
    {
      key: "fajr_tomorrow",
      adhanKey: "Fajr Adhan",
      jamaahKey: "Fajr Iqamah",
      source: "tomorrow",
    },
  ];
}
