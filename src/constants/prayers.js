// src/constants/prayers.js
// Ordered list of prayers with their Adhan and Iqamah column keys from the Google Sheet

export const PRAYERS = [
  { key: "fajr",    adhanKey: "Fajr Adhan",    iqamahKey: "Fajr Iqamah" },
  { key: "sunrise", adhanKey: "Shouruq",       iqamahKey: "Shouruq" }, // sunrise
  { key: "dhuhr",   adhanKey: "Dhuhr Adhan",   iqamahKey: "Dhuhr Iqamah" },
  { key: "asr",     adhanKey: "Asr Adhan",     iqamahKey: "Asr Iqamah" },
  { key: "maghrib", adhanKey: "Maghrib Adhan", iqamahKey: "Maghrib Iqamah" },
  { key: "isha",    adhanKey: "Isha Adhan",    iqamahKey: "Isha Iqamah" },
];
