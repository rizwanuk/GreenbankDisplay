// src/hooks/useQuranBookmarks.js
import { useCallback, useEffect, useMemo, useState } from "react";

const LS_KEY         = "gbm_quran_bookmarks_v1";
const LS_DELETED_KEY = "gbm_quran_bookmarks_deleted_v1";
const RETAIN_DAYS    = 30;

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

export default function useQuranBookmarks() {
  const [items, setItems] = useState(() =>
    safeParse(localStorage.getItem(LS_KEY) || "[]")
  );

  const [deletedItems, setDeletedItems] = useState(() => {
    const raw = safeParse(localStorage.getItem(LS_DELETED_KEY) || "[]");
    const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
    return raw.filter((b) => (b.deletedAt || 0) > cutoff);
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(LS_DELETED_KEY, JSON.stringify(deletedItems));
  }, [deletedItems]);

  const bookmarks = useMemo(
    () => [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [items]
  );

  const recentlyDeleted = useMemo(
    () => [...deletedItems].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0)),
    [deletedItems]
  );

  const addBookmark = useCallback(({ juz, page, absPage, surah, label }) => {
    const j  = Number(juz);
    const p  = Number(page);
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
    setItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) {
        setDeletedItems((d) => [{ ...target, deletedAt: Date.now() }, ...d]);
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const restoreBookmark = useCallback((id) => {
    setDeletedItems((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) {
        const { deletedAt, ...restored } = target;
        setItems((items) => [{ ...restored, id: makeId(), createdAt: Date.now() }, ...items]);
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const purgeDeletedBookmark = useCallback((id) => {
    setDeletedItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      const withTimestamp = prev.map((b) => ({ ...b, deletedAt: Date.now() }));
      setDeletedItems((d) => [...withTimestamp, ...d]);
      return [];
    });
  }, []);

  const clearAllDeleted = useCallback(() => setDeletedItems([]), []);

  return {
    bookmarks,
    recentlyDeleted,
    addBookmark,
    removeBookmark,
    restoreBookmark,
    purgeDeletedBookmark,
    clearAll,
    clearAllDeleted,
  };
}