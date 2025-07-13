module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  safelist: [
    {
      pattern: /^(bg|text|w|h|px|py|pt|pb|pl|pr|rounded|font|tracking|gap|flex|justify|items|grid|col|row)-(.*)$/,
    },
    {
      pattern: /^text-(sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/,
    },
    {
      pattern: /^text-\[\d+px\]$/, // For text-[180px] etc
    },
    {
      pattern: /^bg-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|slate-\d+|zinc-\d+|emerald-\d+|rose-\d+)$/,
    },
    {
      pattern: /^text-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|sky-\d+|cyan-\d+)$/,
    },
    {
      pattern: /^border-(white|black|gray-\d+|green-\d+|blue-\d+|red-\d+|sky-\d+)(\/\d+)?$/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],        // Added for Theme_3
        lalezar: ['Lalezar', 'cursive'],       // Added for Theme_3
      },
    },
  },
  plugins: [],
};
