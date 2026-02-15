// src/utils/quranFiles.js
export function buildJuzList() {
  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return {
      n,
      label: `Juz-${n}`,
      path: `/quran/Juz-${n}.pdf`, // public/quran/Juz-#.pdf
    };
  });
}
