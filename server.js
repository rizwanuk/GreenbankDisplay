import express from "express";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const apiRoutes = [
  { path: "/api/settings", file: "./api/settings.js" },
  { path: "/api/prayertimes", file: "./api/prayertimes.js" },
  { path: "/api/prayertimes-version", file: "./api/prayertimes-version.js" },
  { path: "/api/device-config", file: "./api/device-config.js" },
  { path: "/api/admin/device-config", file: "./api/admin/device-config.js" },
  { path: "/api/admin/whoami", file: "./api/admin/whoami.js" },
  { path: "/api/admin/prayertimes", file: "./api/admin/prayertimes.js" },
  { path: "/api/admin/settings", file: "./api/admin/settings.js" },
  { path: "/api/wp/prayer-times-2day", file: "./api/wp/prayer-times-2day.js" },
];

for (const route of apiRoutes) {
  const mod = await import(route.file);
  const handler = mod.default;
  app.all(route.path, (req, res) => handler(req, res));
}

// Met Office proxy: /api/met/some/path -> met.js with ?path=some/path
const eventsMod = await import("./api/events.js");
app.get("/api/events", (req, res) => eventsMod.default(req, res));

const metMod = await import("./api/met.js");
app.use("/api/met/", (req, res) => {
  const fullPath = req.originalUrl.replace('/api/met/', '').split('?')[0];
  const origQuery = req.query;
  Object.defineProperty(req, 'query', {
    value: { ...origQuery, path: fullPath },
    writable: true,
    configurable: true
  });
  metMod.default(req, res);
});

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
