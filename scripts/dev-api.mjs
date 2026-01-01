// scripts/dev-api.mjs
import fs from "fs";
import path from "path";
import http from "http";
import { parse as parseUrl } from "url";
import { fileURLToPath } from "url";

/**
 * Dev-only local API runner:
 * - Loads .env.local from project root
 * - Adds minimal res.status()/res.json() helpers
 * - Routes selected /api/* paths to existing Vercel serverless handlers
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is one level up from /scripts
const envPath = path.join(__dirname, "..", ".env.local");

// Debug (safe): confirms path + existence only
console.log("[dev-api] envPath =", envPath);
console.log("[dev-api] envPath exists?", fs.existsSync(envPath));

// ----- Load .env.local (no dotenv dependency) -----
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  env.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const i = trimmed.indexOf("=");
    if (i === -1) return;

    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    // Do not overwrite existing env
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  });
}

// Safe env sanity checks (prints only true/false)
const REQUIRED = [
  "GOOGLE_SHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
];

console.log("[dev-api] ---- ENV CHECK ----");
for (const k of REQUIRED) console.log(`[dev-api] ${k} set?`, !!process.env[k]);
console.log("[dev-api] -------------------");

async function loadHandlers() {
  const adminSettingsMod = await import("../api/admin/settings.js");
  const adminSettings = adminSettingsMod.default || adminSettingsMod;

  const adminPrayerTimesMod = await import("../api/admin/prayertimes.js");
  const adminPrayerTimes = adminPrayerTimesMod.default || adminPrayerTimesMod;

  return {
    "GET /api/admin/settings": adminSettings,
    "POST /api/admin/settings": adminSettings,

    "GET /api/admin/prayertimes": adminPrayerTimes,
    "POST /api/admin/prayertimes": adminPrayerTimes,
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

function enhanceRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.json = (obj) => {
    if (!res.headersSent) res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  };

  res.send = (data) => {
    if (data === undefined) return res.end();
    if (Buffer.isBuffer(data)) return res.end(data);
    if (typeof data === "object") return res.json(data);
    res.end(String(data));
  };

  return res;
}

// ✅ configurable port (default 3000)
const PORT = Number(process.env.DEV_API_PORT || 3000);
const handlers = await loadHandlers();

const server = http.createServer(async (req, res0) => {
  const res = enhanceRes(res0);

  const parsed = parseUrl(req.url, true);
  const routeKey = `${req.method} ${parsed.pathname}`;
  const handler = handlers[routeKey];

  if (!handler) {
    return res.status(404).json({ ok: false, error: "Not Found", routeKey });
  }

  try {
    req.query = parsed.query;
    const bodyText = await readBody(req);
    req.body = bodyText || undefined;

    await handler(req, res);
  } catch (e) {
    console.error("[dev-api] Handler error:", e);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ ok: false, error: e?.message || String(e) });
    }
    try {
      res.end();
    } catch {}
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Dev API runner listening on http://127.0.0.1:${PORT}`);
  console.log(`   Settings:    http://127.0.0.1:${PORT}/api/admin/settings`);
  console.log(`   PrayerTimes: http://127.0.0.1:${PORT}/api/admin/prayertimes`);
});
