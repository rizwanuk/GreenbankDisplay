// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

const EXEC_PATH =
  "/macros/s/AKfycby6WSnTpbeGWBfu_ckjtutNbw12b1SxhmnmZV5Up9tifw26OHummN0FNK395JamPhth-Q/exec";

// Read version straight from package.json (reliable on all CI)
// Works whether the builder is npm, pnpm, or yarn
const { version: pkgVersion } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
);

// Short Git SHA if Vercel provides it
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
  : "";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    proxy: {
      // ✅ Local dev: route Vite /api/* to Vercel serverless functions (vercel dev)
      // Run: `vercel dev --listen 3000` in a second terminal
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },

      "/device-api": {
        target: "https://script.google.com",
        changeOrigin: true,
        secure: true,
        followRedirects: true,
        rewrite: (p) => {
          const q = p.indexOf("?");
          const qs = q >= 0 ? p.slice(q) : "";
          return EXEC_PATH + qs;
        },
        headers: {
          accept: "application/json,text/javascript,*/*;q=0.1",
          "user-agent": "Mozilla/5.0",
        },
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        embed: path.resolve(__dirname, "embed.html"),
      },
    },
  },
  define: {
    // Always set a non-empty version: package.json → git SHA → 'dev'
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkgVersion || gitSha || "dev"),
  },
});
