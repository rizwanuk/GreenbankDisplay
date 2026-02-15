// src/utils/quranFiles.js
export function buildJuzList() {
  // Works on / (Vercel) AND on subpaths (GitHub Pages like /GreenbankDisplay/)
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");

  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return {
      n,
      label: `Juz-${n}`,
      path: `${base}quran/Juz-${n}.pdf`, // public/quran/Juz-#.pdf
    };
  });
}
