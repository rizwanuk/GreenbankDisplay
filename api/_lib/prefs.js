// api/_lib/prefs.js
// In-memory per-endpoint prefs (swap to KV/DB later keeping same API)
const store = new Map(); // endpoint -> { startEnabled, jamaahEnabled, minutesBefore }

async function savePrefs(endpoint, prefs) {
  store.set(endpoint, { ...prefs });
}
async function getPrefs(endpoint) {
  return store.get(endpoint) || null;
}

module.exports = { savePrefs, getPrefs };
