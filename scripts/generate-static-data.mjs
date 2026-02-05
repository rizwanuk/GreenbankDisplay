/**
 * scripts/generate-static-data.mjs
 *
 * Generates static JSON files under /public/data so the app can run "offline-ish"
 * and avoid Vercel Function invocations.
 *
 * Output:
 * - public/data/settings.json
 * - public/data/prayer-times.json
 * - public/data/version.json  (hash + timestamp)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const SHEET_ID = "1TBbaQgecVXEjqJJLTTYlaskcnmfzD1X6OFBpL7Zsw2g";
const BASE = `https://opensheet.elk.sh/${SHEET_ID}`;

const SETTINGS_URL = `${BASE}/settings`;
const PRAYERS_URL = `${BASE}/PrayerTimes`;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.json();
}

function sha256(obj) {
  const json = JSON.stringify(obj);
  return crypto.createHash("sha256").update(json).digest("hex");
}

function writeJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "data");
  ensureDir(outDir);

  console.log("Fetching settings + PrayerTimes from OpenSheet…");
  console.log("Settings:", SETTINGS_URL);
  console.log("PrayerTimes:", PRAYERS_URL);

  const [settings, prayerTimes] = await Promise.all([
    fetchJson(SETTINGS_URL),
    fetchJson(PRAYERS_URL),
  ]);

  if (!Array.isArray(settings)) {
    throw new Error("Expected settings to be an array (OpenSheet tab).");
  }
  if (!Array.isArray(prayerTimes)) {
    throw new Error("Expected prayerTimes to be an array (OpenSheet tab).");
  }

  const settingsPath = path.join(outDir, "settings.json");
  const prayersPath = path.join(outDir, "prayer-times.json");

  writeJson(settingsPath, settings);
  writeJson(prayersPath, prayerTimes);

  // Hash includes both settings + prayers so ANY change triggers refresh
  const hash = sha256({ settings, prayerTimes });

  const version = {
    lastUpdated: new Date().toISOString(),
    hash,
    sources: {
      settings: SETTINGS_URL,
      prayerTimes: PRAYERS_URL,
    },
    counts: {
      settingsRows: settings.length,
      prayerTimesRows: prayerTimes.length,
    },
  };

  const versionPath = path.join(outDir, "version.json");
  writeJson(versionPath, version);

  console.log("✅ Static data generated:");
  console.log(" -", settingsPath);
  console.log(" -", prayersPath);
  console.log(" -", versionPath);
  console.log("hash:", hash);
  console.log("lastUpdated:", version.lastUpdated);
}

main().catch((err) => {
  console.error("❌ generate-static-data failed:");
  console.error(err?.stack || err);
  process.exit(1);
});
