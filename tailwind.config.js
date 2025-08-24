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

      // Project accents (optional)
      colors: {
        greenbank: "#196466",
      },
    },
  },

  /**
   * We safelist utilities that are injected at runtime from the Google Sheet
   * (theme.* and themeMobile.*). Tailwind only keeps classes it can "see" at
   * build time, so anything dynamic must be covered here.
   */
  safelist: [
    // Core color utility families (sheet-driven bg/text/border)
    {
      pattern:
        /(bg|text|border)-(white|black|slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)/,
    },

    // Opacity variants for white/black like "bg-white/10", "border-black/20"
    {
      pattern: /(bg|text|border)-(white|black)\/(5|10|15|20|30|40|50|60|70|80|90)/,
    },

    // Hover variants (e.g., "hover:bg-white/15" coming from the sheet)
    {
      pattern:
        /^bg-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
      variants: ["hover"],
    },
    {
      pattern:
        /^border-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
      variants: ["hover"],
    },
    {
      pattern:
        /^text-(white|black|(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+)(\/\d+)?$/,
      variants: ["hover"],
    },

    // Gradients (if themes use from-/via-/to- color stops)
    {
      pattern:
        /^(from|via|to)-(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(100|200|300|400|500|600|700|800|900)$/,
    },

    // Bare 'border' utility (many sheet rows set "border border-white/20")
    "border",

    // Common one-offs we saw in your sheet/themes
    "bg-white/5",
    "bg-white/10",
    "bg-white/15",
    "text-white",
    "border-white/10",
    "border-white/20",

    // Backdrop blur options (used in headers/cards sometimes)
    { pattern: /^backdrop-blur(-(sm|md|lg|xl|2xl))?$/ },

    // Generic utility families you may reference dynamically (sizes/layout)
    { pattern: /^(p|px|py|pt|pb|pl|pr|m|mx|my|w|h|rounded|shadow|gap|flex|grid|items|justify)-/ },

    // Arbitrary text sizes from the sheet (e.g., text-[180px])
    { pattern: /^text-\[\d+px\]$/ },

    // Common Tailwind heading sizes if they’re sheet-driven
    { pattern: /^text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/ },
  ],

  plugins: [],
};
