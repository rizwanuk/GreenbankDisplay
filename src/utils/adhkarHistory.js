// src/utils/adhkarPresets.js

export const ADHKAR_PRESETS = [
  // After Fajr
  {
    id: "fajr-subhanallah",
    category: "After Fajr",
    arabic: "سُبْحَانَ اللهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    count: 33,
  },
  {
    id: "fajr-alhamdulillah",
    category: "After Fajr",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    count: 33,
  },
  {
    id: "fajr-allahu-akbar",
    category: "After Fajr",
    arabic: "اللهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    count: 34,
  },
  
  // After Maghrib/Isha
  {
    id: "evening-subhanallah",
    category: "After Maghrib/Isha",
    arabic: "سُبْحَانَ اللهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    count: 33,
  },
  {
    id: "evening-alhamdulillah",
    category: "After Maghrib/Isha",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    count: 33,
  },
  {
    id: "evening-allahu-akbar",
    category: "After Maghrib/Isha",
    arabic: "اللهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    count: 34,
  },

  // General Tasbih
  {
    id: "tasbih-subhanallah-100",
    category: "General Tasbih",
    arabic: "سُبْحَانَ اللهِ",
    transliteration: "SubhanAllah",
    translation: "Glory be to Allah",
    count: 100,
  },
  {
    id: "tasbih-alhamdulillah-100",
    category: "General Tasbih",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "All praise is due to Allah",
    count: 100,
  },
  {
    id: "tasbih-allahu-akbar-100",
    category: "General Tasbih",
    arabic: "اللهُ أَكْبَرُ",
    transliteration: "Allahu Akbar",
    translation: "Allah is the Greatest",
    count: 100,
  },
  {
    id: "tasbih-la-ilaha-illallah",
    category: "General Tasbih",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ",
    transliteration: "La ilaha illallah",
    translation: "There is no god but Allah",
    count: 100,
  },
  {
    id: "tasbih-astaghfirullah",
    category: "General Tasbih",
    arabic: "أَسْتَغْفِرُ اللهَ",
    transliteration: "Astaghfirullah",
    translation: "I seek forgiveness from Allah",
    count: 100,
  },

  // Ayat al-Kursi
  {
    id: "ayat-kursi",
    category: "After Each Prayer",
    arabic: "آيَةُ الْكُرْسِيِّ",
    transliteration: "Ayat al-Kursi",
    translation: "The Throne Verse (2:255)",
    count: 1,
  },

  // Morning/Evening Adhkar
  {
    id: "morning-la-ilaha",
    category: "Morning Adhkar",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah",
    translation: "None has the right to be worshipped but Allah alone",
    count: 10,
  },
  {
    id: "evening-la-ilaha",
    category: "Evening Adhkar",
    arabic: "لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah",
    translation: "None has the right to be worshipped but Allah alone",
    count: 10,
  },

  // Salawat on the Prophet ﷺ
  {
    id: "salawat-prophet",
    category: "Salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammad",
    translation: "O Allah, send blessings upon Muhammad",
    count: 10,
  },
  {
    id: "salawat-prophet-100",
    category: "Salawat",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammad",
    translation: "O Allah, send blessings upon Muhammad",
    count: 100,
  },
];

// Group presets by category
export function getAdhkarByCategory() {
  const grouped = {};
  ADHKAR_PRESETS.forEach((adhkar) => {
    if (!grouped[adhkar.category]) {
      grouped[adhkar.category] = [];
    }
    grouped[adhkar.category].push(adhkar);
  });
  return grouped;
}

// Get a single preset by id
export function getAdhkarById(id) {
  return ADHKAR_PRESETS.find((a) => a.id === id);
}