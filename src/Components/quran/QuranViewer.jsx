// src/Components/quran/QuranViewer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PdfJsPage from "./PdfJsPage";
import { buildJuzList } from "../../utils/quranFiles";
import useQuranBookmarks from "../../hooks/useQuranBookmarks";

const LS_LAST_JUZ = "gbm_quran_last_juz";
const LS_LAST_PAGE = "gbm_quran_last_page";
const LS_LAST_ZOOM = "gbm_quran_zoom";
const LS_LAST_SURAH = "gbm_quran_last_surah";

export default function QuranViewer() {
  const juzList = useMemo(() => buildJuzList(), []);
  const { bookmarks, addBookmark, removeBookmark, clearAll } = useQuranBookmarks();

  const [currentJuz, setCurrentJuz] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_JUZ) || "1");
    return Number.isFinite(raw) ? Math.min(30, Math.max(1, raw)) : 1;
  });

  const [page, setPage] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_PAGE) || "1");
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });

  const [numPages, setNumPages] = useState(1);

  const [zoom, setZoom] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_ZOOM) || "1.0");
    return Number.isFinite(raw) ? Math.min(2.5, Math.max(0.7, raw)) : 1.0;
  });

  const [surah, setSurah] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_SURAH) || "");
    return Number.isFinite(raw) && raw > 0 ? raw : "";
  });

  const fitWidth = true;

  const [err, setErr] = useState("");

  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [jumpJuz, setJumpJuz] = useState(currentJuz);
  const [jumpPage, setJumpPage] = useState(page);

  const [quickJuzInput, setQuickJuzInput] = useState(String(currentJuz));
  useEffect(() => setQuickJuzInput(String(currentJuz)), [currentJuz]);

  const [surahInput, setSurahInput] = useState(surah ? String(surah) : "");
  useEffect(() => setSurahInput(surah ? String(surah) : ""), [surah]);

  // Scroll + sizing refs
  const scrollRef = useRef(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);

  // Auto-advance throttle
  const lastAutoNavRef = useRef(0);

  // ✅ Pending navigation (fixes Jump/Bookmarks race conditions)
  const pendingPageRef = useRef(null); // number | "LAST" | null

  // Persist
  useEffect(() => localStorage.setItem(LS_LAST_JUZ, String(currentJuz)), [currentJuz]);
  useEffect(() => localStorage.setItem(LS_LAST_PAGE, String(page)), [page]);
  useEffect(() => localStorage.setItem(LS_LAST_ZOOM, String(zoom)), [zoom]);
  useEffect(() => {
    if (surah) localStorage.setItem(LS_LAST_SURAH, String(surah));
    else localStorage.removeItem(LS_LAST_SURAH);
  }, [surah]);

  const current = useMemo(
    () => juzList.find((j) => j.n === currentJuz) || juzList[0],
    [juzList, currentJuz]
  );

  // ✅ Measure the ACTUAL scroll container width (prevents “page too small”)
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setContainerWidthPx(Math.max(0, Math.floor(w)));
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    window.addEventListener("orientationchange", measure);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // ✅ When Juz changes: load pending page if set, otherwise page 1
  useEffect(() => {
    setErr("");
    setNumPages(1);

    const pending = pendingPageRef.current;
    pendingPageRef.current = null;

    if (pending === "LAST") {
      // wait for numPages to load, then jump to last
      setPage(1);
    } else if (typeof pending === "number" && Number.isFinite(pending) && pending > 0) {
      setPage(pending);
    } else {
      setPage(1);
    }

    setJumpJuz(currentJuz);
    setJumpPage(1);

    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [currentJuz]);

  // Clamp page when numPages updates (also supports pending LAST)
  useEffect(() => {
    const n = numPages || 1;

    // If we intended "LAST", jump now that we know numPages
    if (pendingPageRef.current === "LAST") {
      pendingPageRef.current = null;
      setPage(n);
      return;
    }

    setPage((p) => Math.min(Math.max(1, p), n));
  }, [numPages]);

  // When page changes, scroll to top (reader-style)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [page]);

  const goPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const goNextPage = () => setPage((p) => Math.min(numPages || 1, p + 1));

  const goPrevJuz = () => {
    if (currentJuz <= 1) return;
    pendingPageRef.current = "LAST";
    setCurrentJuz((j) => Math.max(1, j - 1));
  };

  const goNextJuz = () => {
    if (currentJuz >= 30) return;
    pendingPageRef.current = 1;
    setCurrentJuz((j) => Math.min(30, j + 1));
  };

  const handleNumPages = useCallback((n) => setNumPages(n || 1), []);
  const handleError = useCallback((m) => setErr(m), []);

  const quickGoJuz = () => {
    const j = Math.min(30, Math.max(1, Number(quickJuzInput) || 1));
    if (j !== currentJuz) {
      pendingPageRef.current = 1;
      setCurrentJuz(j);
      setShowControls(false);
      setShowJump(false);
      setShowBookmarks(false);
    }
  };

  const saveSurahPlaceholder = () => {
    const s = Number(surahInput);
    if (Number.isFinite(s) && s >= 1 && s <= 114) setSurah(s);
  };

  const applyJump = () => {
    setErr("");
    const j = Math.min(30, Math.max(1, Number(jumpJuz) || 1));
    const p = Math.max(1, Number(jumpPage) || 1);

    if (j !== currentJuz) {
      pendingPageRef.current = p;
      setCurrentJuz(j);
    } else {
      setPage(p);
    }

    setShowJump(false);
    setShowControls(false);
    setShowBookmarks(false);
  };

  const addCurrentBookmark = () => {
    addBookmark({
      juz: currentJuz,
      page,
      surah: surah || undefined,
      label: surah ? `Surah ${surah}` : undefined,
    });
    setShowBookmarks(true);
    setShowJump(false);
    setShowControls(false);
  };

  const openBookmark = (b) => {
    setErr("");
    if (b.juz !== currentJuz) {
      pendingPageRef.current = Math.max(1, Number(b.page) || 1);
      setCurrentJuz(b.juz);
    } else {
      setPage(Math.max(1, Number(b.page) || 1));
    }
    if (b.surah) setSurah(b.surah);
    setShowBookmarks(false);
    setShowJump(false);
    setShowControls(false);
  };

  // Auto-advance on scroll bottom/top (throttled)
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const now = Date.now();
    if (now - lastAutoNavRef.current < 650) return;

    const threshold = 24;
    const atTop = el.scrollTop <= threshold;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;

    if (atBottom) {
      if (page < (numPages || 1)) {
        lastAutoNavRef.current = now;
        setPage((p) => Math.min(numPages || 1, p + 1));
      } else if (currentJuz < 30) {
        lastAutoNavRef.current = now;
        pendingPageRef.current = 1;
        setCurrentJuz((j) => Math.min(30, j + 1));
      }
    } else if (atTop) {
      if (page > 1) {
        lastAutoNavRef.current = now;
        setPage((p) => Math.max(1, p - 1));
      } else if (currentJuz > 1) {
        lastAutoNavRef.current = now;
        pendingPageRef.current = "LAST";
        setCurrentJuz((j) => Math.max(1, j - 1));
      }
    }
  };

  const onEnter = (e, fn) => {
    if (e.key === "Enter") fn();
  };

  return (
    // ✅ min-h-0 is critical so the scroll area can actually grow/shrink in a flex column
    <div className="h-full min-h-0 flex flex-col px-2 pt-2 pb-3">
      {/* Compact top bar */}
      <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold leading-tight">Qur’an</div>
            <div className="text-xs opacity-80">
              <span className="font-semibold">Juz-{currentJuz}</span>
              <span className="opacity-70"> • </span>
              <span className="font-semibold">
                Page {page}/{numPages || 1}
              </span>
              {surah ? <span className="opacity-70"> • Surah {surah}</span> : null}
            </div>
          </div>

          <button
            onClick={() => {
              setShowControls((v) => !v);
              setShowJump(false);
              setShowBookmarks(false);
            }}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
          >
            Controls
          </button>

          <button
            onClick={() => {
              setShowBookmarks((v) => !v);
              setShowJump(false);
              setShowControls(false);
            }}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
          >
            Bookmarks
          </button>

          <button
            onClick={() => {
              setShowJump((v) => !v);
              setShowBookmarks(false);
              setShowControls(false);
              setJumpJuz(currentJuz);
              setJumpPage(page);
            }}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
          >
            Jump
          </button>
        </div>
      </div>

      {/* Controls sheet */}
      {showControls && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/25 p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">Controls</div>
            <button
              onClick={() => setShowControls(false)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
            >
              Close
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={goPrevJuz}
              disabled={currentJuz === 1}
              className={[
                "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
                "bg-black/25 hover:bg-black/35",
                currentJuz === 1 ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              ◀ Prev Juz
            </button>

            <button
              onClick={goNextJuz}
              disabled={currentJuz === 30}
              className={[
                "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
                "bg-black/25 hover:bg-black/35",
                currentJuz === 30 ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              Next Juz ▶
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs opacity-70">Go Juz</div>
            <input
              value={quickJuzInput}
              onChange={(e) => setQuickJuzInput(e.target.value)}
              onKeyDown={(e) => onEnter(e, quickGoJuz)}
              inputMode="numeric"
              className="w-14 rounded-lg border border-white/15 bg-black/25 px-2 py-2 text-sm outline-none"
            />
            <button
              onClick={quickGoJuz}
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Go
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs opacity-70">Zoom</div>
              <button
                onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.08).toFixed(2)))}
                className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
              >
                −
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.08).toFixed(2)))}
                className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
              >
                +
              </button>
            </div>
          </div>

          {/* Surah placeholder */}
          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs opacity-70">Surah</div>
            <input
              value={surahInput}
              onChange={(e) => setSurahInput(e.target.value)}
              onKeyDown={(e) => onEnter(e, saveSurahPlaceholder)}
              inputMode="numeric"
              placeholder="1–114"
              className="w-20 rounded-lg border border-white/15 bg-black/25 px-2 py-2 text-sm outline-none"
            />
            <button
              onClick={saveSurahPlaceholder}
              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Set
            </button>

            <a
              href={current.path}
              target="_blank"
              rel="noreferrer"
              className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Open PDF
            </a>
          </div>

          <div className="mt-2">
            <button
              onClick={addCurrentBookmark}
              className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              + Bookmark this page
            </button>
          </div>
        </div>
      )}

      {/* Jump sheet */}
      {showJump && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/25 p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">Jump</div>
            <button
              onClick={() => setShowJump(false)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="text-xs opacity-70 w-10">Juz</div>
            <input
              value={jumpJuz}
              onChange={(e) => setJumpJuz(e.target.value)}
              onKeyDown={(e) => onEnter(e, applyJump)}
              inputMode="numeric"
              className="w-20 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
            />
            <div className="text-xs opacity-70 w-12">Page</div>
            <input
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => onEnter(e, applyJump)}
              inputMode="numeric"
              className="w-20 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={applyJump}
              className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Go
            </button>
          </div>

          <div className="mt-2 text-xs opacity-70">Surah jump mapping will be added later.</div>
        </div>
      )}

      {/* Bookmarks sheet */}
      {showBookmarks && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/25 p-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">Bookmarks</div>
            <button
              onClick={() => setShowBookmarks(false)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-xs font-semibold hover:bg-black/35"
            >
              Close
            </button>
          </div>

          <div className="mt-3 space-y-2 max-h-56 overflow-auto">
            {!bookmarks.length && <div className="text-sm opacity-80">No bookmarks yet.</div>}
            {bookmarks.map((b) => (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => openBookmark(b)} className="text-left min-w-0 flex-1">
                    <div className="font-semibold">
                      Juz-{b.juz} • Page {b.page}
                      {b.surah ? <span className="opacity-70"> • Surah {b.surah}</span> : null}
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </button>

                  <button
                    onClick={() => removeBookmark(b.id)}
                    className="shrink-0 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {bookmarks.length > 0 && (
            <div className="mt-3">
              <button
                onClick={clearAll}
                className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {err && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/20 p-3">
          <div className="font-semibold mb-1">Problem</div>
          <div className="text-sm opacity-85">{err}</div>
        </div>
      )}

      {/* ✅ PDF panel fills remaining height */}
      <div className="mt-2 flex-1 min-h-0 rounded-2xl border border-white/15 bg-black/20 overflow-hidden flex flex-col">
        {/* ✅ Only this area scrolls */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* remove extra horizontal padding so the page can truly fill width */}
          <div className="py-2">
            <PdfJsPage
              url={current.path}
              pageNumber={page}
              zoom={zoom}
              fitWidth={fitWidth}
              containerWidthPx={containerWidthPx}
              onNumPages={handleNumPages}
              onError={handleError}
            />
          </div>
        </div>

        {/* Bottom nav (always visible) */}
        <div className="border-t border-black/10 bg-white/95 backdrop-blur px-3 py-2 flex items-center gap-2">
          <button
            onClick={goPrevPage}
            disabled={page <= 1 && currentJuz === 1}
            className={[
              "rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold",
              "bg-black/5 hover:bg-black/10",
              page <= 1 && currentJuz === 1 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ◀ Prev
          </button>

          <div className="text-sm font-semibold">
            Juz-{currentJuz} • {page}/{numPages || 1}
          </div>

          <button
            onClick={goNextPage}
            disabled={page >= (numPages || 1) && currentJuz === 30}
            className={[
              "ml-auto rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold",
              "bg-black/5 hover:bg-black/10",
              page >= (numPages || 1) && currentJuz === 30 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}
