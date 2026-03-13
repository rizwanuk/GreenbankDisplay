// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";

// Read version straight from package.json (reliable on all CI)
const { version: pkgVersion } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const API_PROXY_TARGET = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";

  return {
    base: "/",
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          secure: true,
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
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        pkgVersion || "dev"
      ),
    },
  };
});
