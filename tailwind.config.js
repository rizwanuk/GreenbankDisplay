// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      // Self-hosted fonts mapped to utilities
      fontFamily: {
        rubik: ["Rubik", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        cairo: ["Cairo", "sans-serif"],
        lalezar: ["Lalezar", "cursive"],
        poppins: ["Poppins", "sans-serif"],
        arabic: ["Amiri", "serif"],
      },
      colors: {
        greenbank: "#196466",
      },
    },
  },

  // Keep runtime (sheet-driven) utilities from being purged.
  safelist: [
    // Common one-offs used across screens
    "border",
    "bg-white/5", "bg-white/10", "bg-white/15",
    "text-white",
    "border-white/10", "border-white/20",

    // Mobile theme colors you listed
    "bg-gray-800", "bg-emerald-700", "bg-emerald-900",
    "text-yellow-300", "text-lime-300",

    // Named Tailwind text sizes (if your sheet uses these tokens)
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/ },

    // ===== Main display: arbitrary font sizes from the sheet =====
    // e.g. text-[28px], text-[2.8vw], text-[1.75rem]
    { pattern: /^text-\[(\d+(\.\d+)?)px\]$/ },
    { pattern: /^text-\[(\d+(\.\d+)?)vw\]$/ },
    { pattern: /^text-\[(\d+(\.\d+)?)rem\]$/ },

    // Responsive variants for arbitrary sizes (md:text-[...], etc.)
    { pattern: /^text-\[(\d+(\.\d+)?)px\]$/, variants: ["sm","md","lg","xl","2xl"] },
    { pattern: /^text-\[(\d+(\.\d+)?)vw\]$/, variants: ["sm","md","lg","xl","2xl"] },
    { pattern: /^text-\[(\d+(\.\d+)?)rem\]$/, variants: ["sm","md","lg","xl","2xl"] },

    // Line-height from sheet (e.g. leading-[1.15], leading-[32px])
    { pattern: /^leading-\[(\d+(\.\d+)?)\]$/ },
    { pattern: /^leading-\[(\d+(\.\d+)?)px\]$/ },
    { pattern: /^leading-(none|tight|snug|normal|relaxed|loose)$/ },

    // Letter-spacing from sheet (optional)
    { pattern: /^tracking-(tighter|tight|normal|wide|wider|widest)$/ },
    { pattern: /^tracking-\[-?\d+(\.\d+)?(px|em)\]$/ },

    // Opacity variants for white/black (bg/border/text) incl. hover
    { pattern: /^(bg|text|border)-(white|black)\/(5|10|15|20|30|40|50|60|70|80|90)$/ },
    { pattern: /^hover:bg-(white|black)\/(5|10|15|20|30|40|50|60|70|80|90)$/ },

    // Small color-family net for occasional sheet colors on desktop
    { pattern: /^(bg|text|border)-(gray|emerald|yellow)-(50|100|200|300|400|500|600|700|800|900)$/ },
    { pattern: /^hover:bg-(gray|emerald|yellow)-(50|100|200|300|400|500|600|700|800|900)$/ },

    // If your themes use gradient stops like from-emerald-700 etc.
    { pattern: /^(from|via|to)-(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|200|300|400|500|600|700|800|900)$/ },
  ],

  plugins: [],
};
