// src/utils/labels.js
// Robust helpers that work with your existing parsed settings shapes:
// - settings.labels (English) and settings.labels.arabic or settings.arabic (Arabic)
// - OR a flat "settingsMap" with keys like "labels.fajr" / "labels.arabic.fajr"

function toLowerKeys(obj = {}) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => (out[String(k).toLowerCase()] = v));
  return out;
}

export function getEnglishLabels(settingsOrMap) {
  if (!settingsOrMap) return {};
  // Case 1: grouped structure from parseSettings()
  if (settingsOrMap.labels && typeof settingsOrMap.labels === "object") {
    // Remove nested arabic group if present
    const { arabic, ...english } = settingsOrMap.labels;
    return toLowerKeys(english);
  }

  // Case 2: flat map like "labels.fajr"
  const out = {};
  Object.entries(settingsOrMap).forEach(([k, v]) => {
    const lk = k.toLowerCase();
    if (lk.startsWith("labels.") && !lk.startsWith("labels.arabic.")) {
      const key = lk.split(".")[1]; // labels.fajr -> fajr
      out[key] = v;
    }
  });
  return out;
}

export function getArabicLabels(settingsOrMap) {
  if (!settingsOrMap) return {};
  // Case 1: grouped structure from parseSettings()
  const arabicGroup =
    settingsOrMap.labels?.arabic || settingsOrMap.arabic || null;
  if (arabicGroup && typeof arabicGroup === "object") {
    return toLowerKeys(arabicGroup);
  }

  // Case 2: flat map like "labels.arabic.fajr"
  const out = {};
  Object.entries(settingsOrMap).forEach(([k, v]) => {
    const lk = k.toLowerCase();
    if (lk.startsWith("labels.arabic.")) {
      const key = lk.split(".")[2]; // labels.arabic.fajr -> fajr
      out[key] = v;
    }
  });
  return out;
}
