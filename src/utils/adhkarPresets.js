// src/utils/adhkarPresets.js

/**
 * New structure:
 * - adhkar can belong to MULTIPLE groups via `groups: []`
 * - packs are separate, and reference adhkar by id
 *
 * Backwards-compat:
 * - we keep helper functions similar to what you already use
 */

export const ADHKAR_PRESETS = [
  // --- Tasbih 33/33/34 (used in multiple places) ---
  {
    id: "subhanallah-33",
    arabic: "سُبْحَانَ اللهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    count: 33,
    groups: ["After Fajr", "After Maghrib/Isha", "After Salah", "Daily Essentials"],
    order: 10,
  },
  {
    id: "alhamdulillah-33",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    count: 33,
    groups: ["After Fajr", "After Maghrib/Isha", "After Salah", "Daily Essentials"],
    order: 11,
  },
  {
    id: "allahu-akbar-34",
    arabic: "اللهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    count: 34,
    groups: ["After Fajr", "After Maghrib/Isha", "After Salah", "Daily Essentials"],
    order: 12,
  },

  // --- General Tasbih (100) ---
  {
    id: "subhanallah-100",
    arabic: "سُبْحَانَ اللهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    count: 100,
    groups: ["General Tasbih"],
    order: 100,
  },
  {
    id: "alhamdulillah-100",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    count: 100,
    groups: ["General Tasbih"],
    order: 101,
  },
  {
    id: "allahu-akbar-100",
    arabic: "اللهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    count: 100,
    groups: ["General Tasbih"],
    order: 102,
  },
  {
    id: "la-ilaha-illallah-100",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ",
    transliteration: "La ilaha illallah",
    translation: "There is no god but Allah",
    count: 100,
    groups: ["General Tasbih", "Daily Essentials"],
    order: 103,
  },
  {
    id: "astaghfirullah-100",
    arabic: "أَسْتَغْفِرُ اللهَ",
    transliteration: "Astaghfirullah",
    translation: "I seek forgiveness from Allah",
    count: 100,
    groups: ["General Tasbih", "Daily Essentials"],
    order: 104,
  },

  // --- Ayat al-Kursi (multi-group) ---
  {
    id: "ayat-kursi",
    arabic: "آيَةُ الْكُرْسِيِّ",
    transliteration: "Ayat al-Kursi",
    translation: "The Throne Verse (2:255)",
    count: 1,
    groups: ["After Salah", "Morning Adhkar", "Evening Adhkar", "Daily Essentials"],
    order: 20,
  },

  // --- Morning / Evening adhkar ---
  {
    id: "morning-la-ilaha-10",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah",
    translation: "None has the right to be worshipped but Allah alone",
    count: 10,
    groups: ["Morning Adhkar"],
    order: 30,
  },
  {
    id: "evening-la-ilaha-10",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah",
    translation: "None has the right to be worshipped but Allah alone",
    count: 10,
    groups: ["Evening Adhkar"],
    order: 31,
  },

  // --- Salawat ---
  {
    id: "salawat-10",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammad",
    translation: "O Allah, send blessings upon Muhammad",
    count: 10,
    groups: ["Salawat", "Daily Essentials"],
    order: 40,
  },
  {
    id: "salawat-100",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammad",
    translation: "O Allah, send blessings upon Muhammad",
    count: 100,
    groups: ["Salawat"],
    order: 41,
  },
];

/**
 * Packs are curated "bundles" of adhkar IDs.
 * These can be used in the "Add Adhkar → Packs" UI.
 */
export const ADHKAR_PACKS = [
  {
    id: "pack-after-fajr",
    title: "After Fajr",
    description: "33/33/34 + Ayat al-Kursi",
    items: ["subhanallah-33", "alhamdulillah-33", "allahu-akbar-34", "ayat-kursi"],
  },
  {
    id: "pack-after-maghrib-isha",
    title: "After Maghrib/Isha",
    description: "33/33/34 + Ayat al-Kursi",
    items: ["subhanallah-33", "alhamdulillah-33", "allahu-akbar-34", "ayat-kursi"],
  },
  {
    id: "pack-daily-essentials",
    title: "Daily Essentials",
    description: "Core daily set",
    items: ["ayat-kursi", "salawat-10", "la-ilaha-illallah-100", "astaghfirullah-100"],
  },
  {
    id: "pack-morning",
    title: "Morning",
    description: "Morning adhkar essentials",
    items: ["morning-la-ilaha-10", "ayat-kursi", "salawat-10"],
  },
  {
    id: "pack-evening",
    title: "Evening",
    description: "Evening adhkar essentials",
    items: ["evening-la-ilaha-10", "ayat-kursi", "salawat-10"],
  },
];

// ---------------------- Helpers ----------------------

export function getAdhkarById(id) {
  return ADHKAR_PRESETS.find((a) => a.id === id);
}

export function getPackById(id) {
  return ADHKAR_PACKS.find((p) => p.id === id);
}

/**
 * Group by `groups[]` (multi-group).
 * Output: { [groupName]: preset[] }
 */
export function getAdhkarByGroup() {
  const grouped = {};
  ADHKAR_PRESETS.forEach((adhkar) => {
    const groups = Array.isArray(adhkar.groups) ? adhkar.groups : [];
    groups.forEach((g) => {
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(adhkar);
    });
  });

  // sort each group by order then arabic/transliteration
  Object.keys(grouped).forEach((g) => {
    grouped[g].sort((a, b) => {
      const ao = a.order ?? 9999;
      const bo = b.order ?? 9999;
      if (ao !== bo) return ao - bo;
      return (a.transliteration || "").localeCompare(b.transliteration || "");
    });
  });

  return grouped;
}

/**
 * Backwards-compatible alias, so your existing UI can keep working while we update it.
 * Previously: getAdhkarByCategory()
 * Now: returns group-based map.
 */
export function getAdhkarByCategory() {
  return getAdhkarByGroup();
}

/**
 * Resolve pack item IDs into actual preset objects (dropping unknown IDs safely).
 */
export function resolvePackItems(pack) {
  const items = (pack?.items || []).map(getAdhkarById).filter(Boolean);
  return items;
}
