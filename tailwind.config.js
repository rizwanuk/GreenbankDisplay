// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  safelist: [
    {
      // keep lots of utility families (dynamic from sheet)
      pattern: /^(bg|text|w|h|px|py|pt|pb|pl|pr|rounded|font|tracking|gap|flex|justify|items|grid|col|row)-(.*)$/,
    },
    { pattern: /^text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/ },
    { pattern: /^text-\[\d+px\]$/ },

    // ✅ Allow bg-... and optional "/NN" opacity (e.g. bg-white/5)
    {
      pattern:
        /^bg-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|slate-\d+|zinc-\d+|emerald-\d+|rose-\d+|cyan-\d+|greenbank|greenbankLight)(\/\d+)?$/,
    },
    // ✅ Allow text-... and optional "/NN" opacity if you ever use it
    {
      pattern:
        /^text-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|sky-\d+|cyan-\d+)(\/\d+)?$/,
    },
    // already allowed for borders, keep as-is
    {
      pattern:
        /^border-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|sky-\d+|cyan-\d+)(\/\d+)?$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        greenbank: "#196466",
        greenbankLight: "#ADCECD",
      },
      fontFamily: {
        rubik: ["Rubik", "sans-serif"],
        cairo: ["Cairo", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        lalezar: ["Lalezar", "cursive"],
        // ✅ Add Poppins so you can use `font-poppins`
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
