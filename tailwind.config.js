// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Map Tailwind font utility classes to your self-hosted font-faces
      fontFamily: {
        rubik: ["Rubik", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        cairo: ["Cairo", "sans-serif"],
        lalezar: ["Lalezar", "cursive"],
        poppins: ["Poppins", "sans-serif"],
        arabic: ["Amiri", "serif"], // gives you class: font-arabic
      },
      colors: {
        greenbank: "#196466",
        greenbankLight: "#ADCECD",
      },
    },
  },

  // Keep any utilities that are injected at runtime from the Google Sheet
  safelist: [
    // Dynamic font utilities from the sheet
    { pattern: /^font-(rubik|inter|cairo|lalezar|poppins|arabic)$/ },

    // Color utilities (support shades + optional /opacity like bg-white/10)
    {
      pattern:
        /^bg-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
    },
    {
      pattern:
        /^text-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
    },
    {
      pattern:
        /^border-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
    },

    // Backdrop blur coming from the sheet (e.g., backdrop-blur-md)
    { pattern: /^backdrop-blur(-(sm|md|lg|xl|2xl))?$/ },

    // Generic utility families you reference dynamically (widths, spacing, etc.)
    { pattern: /^(p|px|py|pt|pb|pl|pr|m|mx|my|w|h|rounded|shadow|gap|flex|grid|items|justify)-/ },

    // Arbitrary text sizes from the sheet (e.g., text-[180px])
    { pattern: /^text-\[\d+px\]$/ },

    // Common Tailwind heading sizes if they’re sheet-driven
    { pattern: /^text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/ },
  ],

  plugins: [],
};
