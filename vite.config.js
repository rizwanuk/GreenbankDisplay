// vite.config.js
import { defineConfig, loadEnv } from "vite";
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

export default defineConfig(({ mode }) => {
  // ✅ Load .env, .env.local, etc. so VITE_API_PROXY_TARGET works in vite.config.js
  const env = loadEnv(mode, process.cwd(), "");

  // Default stays local 3000 unless you override in .env.local
  const API_PROXY_TARGET =
    env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";

  return {
    base: "/",
    plugins: [react()],
    server: {
      proxy: {
        // ✅ Dev proxy for API routes
        // Set in .env.local:
        //   VITE_API_PROXY_TARGET=https://greenbank-display.vercel.app
        "/api": {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          secure: true, // set true for https targets (like Vercel)
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
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        pkgVersion || gitSha || "dev"
      ),
    },
  };
});
