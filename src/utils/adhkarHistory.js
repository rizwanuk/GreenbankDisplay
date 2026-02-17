// src/utils/adhkarHistory.js
// Stores completed adhkar sessions in localStorage.
// Each record is a lightweight object so we can store dozens of sessions.

const LS_HISTORY_KEY = "gbm_adhkar_history_v1";
const MAX_HISTORY = 60; // keep up to 60 sessions

/**
 * @typedef {Object} HistoryRecord
 * @property {string}  id          - unique id (timestamp string)
 * @property {string}  mode        - "general" | "taraweeh" | "basket"
 * @property {number}  completedAt - unix ms
 * @property {number}  totalCount  - total taps / total target (general/taraweeh)
 * @property {number}  target      - target for general/taraweeh
 * @property {Array}   items       - for basket: [{id, transliteration, count, completed}]
 */

/** Load history array from localStorage (newest first). */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist history array. */
function saveHistory(records) {
  try {
    localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
  } catch {
    // storage full — silently ignore
  }
}

/**
 * Append a completed session record.
 * @param {Omit<HistoryRecord, 'id' | 'completedAt'>} data
 */
export function appendHistory(data) {
  const record = {
    id: String(Date.now()),
    completedAt: Date.now(),
    ...data,
  };
  const prev = loadHistory();
  saveHistory([record, ...prev]);
  return record;
}

/** Clear all history. */
export function clearHistory() {
  localStorage.removeItem(LS_HISTORY_KEY);
}

/** Delete a single record by id. */
export function deleteHistoryRecord(id) {
  const prev = loadHistory();
  saveHistory(prev.filter((r) => r.id !== id));
}

/**
 * Format a unix-ms timestamp as a human-readable relative or absolute string.
 * e.g. "Today 14:32", "Yesterday 09:15", "12 Feb 2025"
 */
export function formatHistoryDate(ms) {
  const d = new Date(ms);
  const now = new Date();

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (sameDay(d, now)) return `Today ${timeStr}`;
  if (sameDay(d, yesterday)) return `Yesterday ${timeStr}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}