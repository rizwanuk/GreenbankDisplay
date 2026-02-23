// src/hooks/useQuranBookmarks.js
import { useCallback, useEffect, useMemo, useState } from "react";

const LS_KEY = "gbm_quran_bookmarks_v1";

function safeParse(raw) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Bookmark:
 * { id, createdAt, juz, page, surah?, label? }
 */
export default function useQuranBookmarks() {
  const [items, setItems] = useState(() => safeParse(localStorage.getItem(LS_KEY) || "[]"));

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  const bookmarks = useMemo(() => {
    return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [items]);

  const addBookmark = useCallback(({ juz, page, absPage, surah, label }) => {
    const j = Number(juz);
    const p = Number(page);
    const ap = Number(absPage);

    if (!Number.isFinite(j) || j < 1 || j > 30) return;
    if (!Number.isFinite(p) || p < 1) return;

    setItems((prev) => [
      {
        id: makeId(),
        createdAt: Date.now(),
        juz: j,
        page: p,
        absPage: Number.isFinite(ap) ? ap : undefined,
        surah: Number.isFinite(Number(surah)) ? Number(surah) : undefined,
        label: (label || "").trim() || undefined,
      },
      ...prev,
    ]);
  }, []);

  const removeBookmark = useCallback((id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  return { bookmarks, addBookmark, removeBookmark, clearAll };
}