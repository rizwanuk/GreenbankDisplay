// src/utils/adhkarPresets.js

/**
 * Structure:
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

  // -----------------------------
  // New: General Duas (recite once)
  // -----------------------------
  {
    id: "dua-beneficial-knowledge",
    arabic: "اَللَّهُمَّ إِنًيِ أَسْأَلُكَ عِلْمًانَّافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا.",
    transliteration:
      "Allahumma inni as'aluka 'ilman naafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan",
    translation: "O Allah, I ask You for beneficial knowledge, goodly provision and acceptable deeds",
    count: 1,
    groups: ["General Duas", "Riz Pack"],
    order: 200,
  },
  {
    id: "dua-hardship-need",
    arabic:
      "لَا إِلَهَ إِلَّا اللَّهُ الْعَلِيمُ الْحَلِيمُ ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَوَاتِ وَرَبُّ الْأَرْضِ رَبُّ الْعَرْشِ الْكَرِيمِ",
    transliteration:
      "La ilaha illallahul-'aleemul-haleem, la ilaha illallahu rabbul-'arshil-'azeem, la ilaha illallahu rabbus-samawati wa rabbul-ardi rabbul-'arshil-kareem",
    translation:
      "None has the right to be worshipped except Allah, the Knowing, the Forbearing... Lord of the heavens and the earth and the Noble Throne.",
    count: 1,
    groups: ["General Duas", "Riz Pack"],
    order: 201,
  },
  {
    id: "dua-distress-rahmataka-arju",
    arabic:
      "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَا أَنْتَ",
    transliteration:
      "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'ayn, wa aslih li sha'ni kullah, la ilaha illa ant",
    translation:
      "O Allah, I hope for Your mercy. Do not leave me to myself even for a blink of an eye. Correct all of my affairs for me. There is none worthy of worship except You.",
    count: 1,
    groups: ["General Duas", "Riz Pack"],
    order: 202,
  },
  {
    id: "dua-loss-inna-lillah",
    arabic:
      "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي، وَأَخْلِفْ لِي خَيْراً مِنْهَا",
    transliteration:
      "Inna lillahi wa inna ilayhi raji'un. Allahumma'jurni fi musibati, wa akhlif li khayran minha",
    translation:
      "We are from Allah and unto Him we return. O Allah reward me in my affliction and replace it with something better.",
    count: 1,
    groups: ["General Duas"],
    order: 203,
  },
  {
    id: "dua-relief-ya-hayyu-ya-qayyum",
    arabic: "يَا حَيُّ يَا قَيُّوْمُ بِرَحْمَتِكَ أَسْتَغِيْث",
    transliteration: "Ya Hayyu Ya Qayyum bi rahmatika astagheeth",
    translation: "O Living and Eternal Sustainer! By Your mercy I seek relief!",
    count: 1,
    groups: ["General Duas"],
    order: 204,
  },
  {
    id: "dua-contentment-qanni-ni",
    arabic:
      "اللّهُمَّ قَنِّعْنِيْ بِمَا رَزَقْتَنِيْ ، وَبَارِكْ لِيْ فِيْهِ ، وَاخْلُفْ عَلَى كُلِّ غَائِبَةٍ بِخَيْرٍ",
    transliteration:
      "Allahumma qanni'ni bima razaqtani, wa barik li fihi, wa akhluf 'ala kulli gha'ibatin bikhayr",
    translation:
      "O Allah, make me content with what You have provided, bless it for me, and replace for me every absent thing with something better.",
    count: 1,
    groups: ["General Duas"],
    order: 205,
  },
  {
    id: "dua-yunus",
    arabic: "لا إلهَ إلا أنتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظّالِمِيْنَ",
    transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
    translation: "There is no deity but You. Glory be to You! Verily, I have been among the wrongdoers. (21:87)",
    count: 1,
    groups: ["General Duas", "Riz Pack"],
    order: 206,
  },
  {
    id: "dua-asiya",
    arabic: "رَبِّ ابْنِ لِي عِندَكَ بَيْتًا فِي الْجَنَّةِ",
    transliteration: "Rabbi ibni li 'indaka baytan fil-jannah",
    translation: "My Lord! Build for me a home with You in Paradise...",
    count: 1,
    groups: ["General Duas"],
    order: 207,
  },
  {
    id: "dua-grief-anxiety-long",
    arabic:
      "اللّهُـمَّ إِنِّي عَبْـدُكَ ابْنُ عَبْـدِكَ ابْنُ أَمَتِـكَ نَاصِيَتِي بِيَـدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤكَ أَسْأَلُـكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّـيْتَ بِهِ نَفْسَكَ أِوْ أَنْزَلْتَـهُ فِي كِتَابِكَ، أَوْ عَلَّمْـتَهُ أَحَداً مِنْ خَلْقِـكَ أَوِ اسْتَـأْثَرْتَ بِهِ فِي عِلْمِ الغَيْـبِ عِنْـدَكَ أَنْ تَجْـعَلَ القُرْآنَ رَبِيـعَ قَلْبِـي، وَنورَ صَـدْرِي وجَلَاءَ حُـزْنِي وذَهَابَ هَمِّـي",
    transliteration:
      "Allahumma inni 'abduka ibn 'abdika ibn amatika... an taj'alal-Qur'ana rabi'a qalbi wa nura sadri wa jala'a huzni wa dhahaba hammi",
    translation:
      "O Allah, I am Your slave... to make the Qur’an the spring of my heart, the light of my chest, the banisher of my sadness and the reliever of my distress.",
    count: 1,
    groups: ["General Duas"],
    order: 208,
  },
  {
    id: "dua-greatest-name-acceptance",
    arabic:
      "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنِّي أَشْهَدُ أَنَّكَ أَنْتَ اللَّهُ لاَ إِلَهَ إِلاَّ أَنْتَ الأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ",
    transliteration:
      "Allahumma inni as'aluka bi anni ashhadu annaka antAllah... al-ahadus-samad... wa lam yakun lahu kufuwan ahad",
    translation:
      "O Allah, I ask You by my testimony that You are Allah... (reported as being asked by the Greatest Name).",
    count: 1,
    groups: ["General Duas"],
    order: 209,
  },

  // -----------------------------
  // New: Riz Pack items
  // -----------------------------
  {
    id: "riz-durood-jazaallah",
    arabic: "جَزَى اللهُ عَنَّا مُحَمَّدًا صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ مَا هُوَ أَهْلُهُ",
    transliteration: "Jaza Allahu 'anna Muhammadan ﷺ ma huwa ahluhu",
    translation:
      "May Allah reward Muhammad ﷺ on our behalf, such a reward which is due to him (Tabarani).",
    count: 1,
    groups: ["Riz Pack", "Salawat"],
    order: 300,
  },
  {
    id: "riz-increase-wealth",
    arabic: "اللَّهُمَّ أكْثِرْ مَالِي، وَوَلَدِي، وَبَارِكْ لِي فِيمَا أعْطَيْتَنِي",
    transliteration: "Allahumma akthir mali wa waladi wa barik li fima a'taytani",
    translation: "O Allah, increase my wealth and offspring, and bless me in what You have given me (Bukhari 6334).",
    count: 1,
    groups: ["Riz Pack"],
    order: 301,
  },
  {
    id: "riz-protection-poverty-humiliation",
    arabic:
      "اللهمَّ إني أعوذُ بكَ مِن الفَقرِ، والقِلَّة، والذِّلَّة، وأعوذُ بكَ مِن أن أَظْلِمَ أو أُظلَمَ",
    transliteration:
      "Allahumma inni a'udhu bika minal-faqri wal-qillati wadh-dhillah, wa a'udhu bika min an azlima aw uzlam",
    translation:
      "O Allah! I seek refuge in You from poverty, insufficiency, humiliation, and from oppressing or being oppressed (Abi Dawud 1539).",
    count: 1,
    groups: ["Riz Pack"],
    order: 302,
  },
  {
    id: "riz-protection-harm-bismillah-3",
    arabic:
      "بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَىْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration:
      "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa huwa as-sami'ul-'alim",
    translation:
      "In the name of Allah with whose Name nothing on earth or in Heaven harms and He is the All-Hearing, All-Knowing.",
    count: 3,
    groups: ["Riz Pack", "General Duas"],
    order: 303,
  },
  {
    id: "riz-protection-harm-audhu-3",
    arabic: "أَعـوذُ بِكَلِمـاتِ اللّهِ التّـامّـاتِ مِنْ شَـرِّ ما خَلَـق",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the Perfect Words of Allah from the evil of what He has created.",
    count: 3,
    groups: ["Riz Pack", "General Duas"],
    order: 304,
  },
  {
    id: "riz-great-reward-juwairiyah-3",
    arabic:
      "سُبْحـانَ اللهِ وَبِحَمْـدِهِ عَدَدَ خَلْـقِه ، وَرِضـا نَفْسِـه ، وَزِنَـةَ عَـرْشِـه ، وَمِـدادَ كَلِمـاتِـه",
    transliteration:
      "SubhanAllahi wa bihamdihi 'adada khalqihi wa rida nafsihi wa zinata 'arshihi wa midada kalimatihi",
    translation:
      "SubhanAllah wa bihamdihi... (recite 3 times) — reported from Juwairiyah (ra).",
    count: 3,
    groups: ["Riz Pack"],
    order: 305,
  },
  {
    id: "riz-safeguard-from-worries",
    arabic:
      "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحُزْنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
    transliteration:
      "Allahumma inni a'udhu bika minal-hammi wal-huzni wal-'ajzi wal-kasali wal-bukhli wal-jubni wa dala'id-dayni wa ghalabatir-rijal",
    translation:
      "O Allah, I take refuge in You from anxiety and sorrow... the burden of debts and from being overpowered by men (Bukhari).",
    count: 1,
    groups: ["Riz Pack"],
    order: 306,
  },
  {
    id: "riz-debt-and-job-loss",
    arabic: "اللَّهُمَّ اكْفِنِي بِحَلاَلِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكِ عَمَّنْ سِوَاكَ",
    transliteration: "Allahummak-fini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak",
    translation:
      "O Allah, suffice me with what You have allowed instead of what You have forbidden, and make me independent of all others besides You (Tirmidhi).",
    count: 1,
    groups: ["Riz Pack"],
    order: 307,
  },
  {
    id: "riz-protection-worries-7",
    arabic:
      "حَسْبِيَ اللَّهُ لَآ إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ",
    transliteration: "Hasbiyallahu la ilaha illa Huwa 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Azim",
    translation:
      "Allah is sufficient for me... He is Lord of the Majestic Throne. (recite 7 times)",
    count: 7,
    groups: ["Riz Pack"],
    order: 308,
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

  // NEW: Riz Pack (as requested)
  {
    id: "pack-riz",
    title: "Riz Pack",
    description: "Your selected morning / personal duas",
    items: [
      "riz-durood-jazaallah",
      "riz-increase-wealth",
      "riz-protection-poverty-humiliation",
      "riz-protection-harm-bismillah-3",
      "riz-protection-harm-audhu-3",
      "riz-great-reward-juwairiyah-3",
      "riz-safeguard-from-worries",
      "riz-debt-and-job-loss",
      "riz-protection-worries-7",
      // also include these you listed earlier in the same set:
      "dua-beneficial-knowledge",
      "dua-hardship-need",
      "dua-distress-rahmataka-arju",
      "dua-yunus",
    ],
  },

  // Optional: quick access pack for the general duas (handy in UI)
  {
    id: "pack-general-duas",
    title: "General Duas",
    description: "Single-recitation duas",
    items: [
      "dua-beneficial-knowledge",
      "dua-hardship-need",
      "dua-distress-rahmataka-arju",
      "dua-loss-inna-lillah",
      "dua-relief-ya-hayyu-ya-qayyum",
      "dua-contentment-qanni-ni",
      "dua-yunus",
      "dua-asiya",
      "dua-grief-anxiety-long",
      "dua-greatest-name-acceptance",
    ],
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

  // sort each group by order then transliteration
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
