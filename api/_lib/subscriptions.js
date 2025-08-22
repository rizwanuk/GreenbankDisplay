// api/_lib/subscriptions.js
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "subscriptions.json");

// In-memory fallback for serverless (stateless) envs like Vercel
let mem = new Map();

async function ensureFile() {
  if (IS_VERCEL) return; // no persistent FS on Vercel
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE)) {
      await fsp.writeFile(FILE, "[]", "utf8");
    }
  } catch (e) {
    console.warn("[subscriptions] ensureFile failed:", e.message);
  }
}

async function readAll() {
  if (IS_VERCEL) return Array.from(mem.values());
  try {
    await ensureFile();
    const raw = await fsp.readFile(FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.warn("[subscriptions] readAll failed:", e.message);
    return [];
  }
}

async function writeAll(list) {
  if (IS_VERCEL) {
    mem = new Map(list.map((s) => [s.endpoint, s]));
    return;
  }
  try {
    await ensureFile();
    await fsp.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.warn("[subscriptions] writeAll failed:", e.message);
  }
}

async function add(sub) {
  const list = await readAll();
  const i = list.findIndex((x) => x.endpoint === sub.endpoint);
  if (i >= 0) list[i] = sub;
  else list.push(sub);
  await writeAll(list);
  return sub;
}

async function remove(endpoint) {
  const list = await readAll();
  const next = list.filter((x) => x.endpoint !== endpoint);
  await writeAll(next);
  return { removed: list.length - next.length };
}

module.exports = { readAll, add, remove, IS_VERCEL };
