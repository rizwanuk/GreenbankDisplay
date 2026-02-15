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

  // Keep fitWidth ON always for mobile (no horizontal scroll)
  const fitWidth = true;

  const [showJump, setShowJump] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const [jumpJuz, setJumpJuz] = useState(currentJuz);
  const [jumpPage, setJumpPage] = useState(page);

  const [surah, setSurah] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_SURAH) || "");
    return Number.isFinite(raw) && raw > 0 ? raw : "";
  });

  const [err, setErr] = useState("");

  const pdfHostRef = useRef(null);
  const scrollRef = useRef(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);

  // For auto-advance scroll
  const lastAutoNavRef = useRef(0);

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

  // Observe PDF container width (for fit-to-width rendering)
  useEffect(() => {
    if (!pdfHostRef.current) return;
    const el = pdfHostRef.current;

    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      setContainerWidthPx(Math.floor(w));
    });

    ro.observe(el);
    setContainerWidthPx(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  // When Juz changes, reset to page 1 and scroll to top
  useEffect(() => {
    setErr("");
    setPage(1);
    setNumPages(1);
    setJumpJuz(currentJuz);
    setJumpPage(1);

    // ensure scroll resets
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [currentJuz]);

  // Clamp page when numPages updates
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), numPages || 1));
  }, [numPages]);

  // When page changes, scroll back to top (like a reader)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [page]);

  const goPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const goNextPage = () => setPage((p) => Math.min(numPages || 1, p + 1));

  const goPrevJuz = () => setCurrentJuz((j) => Math.max(1, j - 1));
  const goNextJuz = () => setCurrentJuz((j) => Math.min(30, j + 1));

  const handleNumPages = useCallback((n) => setNumPages(n || 1), []);
  const handleError = useCallback((m) => setErr(m), []);

  const applyJump = () => {
    setErr("");
    const j = Math.min(30, Math.max(1, Number(jumpJuz) || 1));
    const p = Math.max(1, Number(jumpPage) || 1);

    if (j !== currentJuz) {
      setCurrentJuz(j);
      // apply page after render loads (best effort)
      setTimeout(() => setPage(p), 0);
    } else {
      setPage(p);
    }

    if (surah) {
      const s = Number(surah);
      if (Number.isFinite(s) && s > 0 && s <= 114) setSurah(s);
    }

    setShowJump(false);
  };

  // ✅ Quick jump by typing Juz number (top toolbar)
  const [quickJuzInput, setQuickJuzInput] = useState(String(currentJuz));
  useEffect(() => setQuickJuzInput(String(currentJuz)), [currentJuz]);

  const quickGoJuz = () => {
    const j = Math.min(30, Math.max(1, Number(quickJuzInput) || 1));
    if (j !== currentJuz) setCurrentJuz(j);
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
  };

  const openBookmark = (b) => {
    setErr("");
    if (b.juz !== currentJuz) {
      setCurrentJuz(b.juz);
      setTimeout(() => setPage(b.page || 1), 0);
    } else {
      setPage(b.page || 1);
    }
    if (b.surah) setSurah(b.surah);
    setShowBookmarks(false);
  };

  // ✅ Auto-advance on scroll bottom/top (with throttle)
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const now = Date.now();
    if (now - lastAutoNavRef.current < 650) return; // throttle

    const threshold = 24; // px
    const atTop = el.scrollTop <= threshold;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;

    if (atBottom) {
      if (page < (numPages || 1)) {
        lastAutoNavRef.current = now;
        setPage((p) => Math.min(numPages || 1, p + 1));
      } else if (currentJuz < 30) {
        lastAutoNavRef.current = now;
        setCurrentJuz((j) => Math.min(30, j + 1));
      }
    } else if (atTop) {
      if (page > 1) {
        lastAutoNavRef.current = now;
        setPage((p) => Math.max(1, p - 1));
      } else if (currentJuz > 1) {
        lastAutoNavRef.current = now;
        setCurrentJuz((j) => Math.max(1, j - 1));
        // move to last page of previous Juz once numPages loads
        setTimeout(() => setPage(9999), 0);
      }
    }
  };

  // Surah placeholder handler (does not jump yet)
  const [surahInput, setSurahInput] = useState(surah ? String(surah) : "");
  useEffect(() => setSurahInput(surah ? String(surah) : ""), [surah]);

  const saveSurahPlaceholder = () => {
    const s = Number(surahInput);
    if (Number.isFinite(s) && s >= 1 && s <= 114) setSurah(s);
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-extrabold leading-tight">Qur’an</div>
            <div className="text-sm opacity-80 leading-snug mt-0.5">
              <span className="font-semibold">Juz-{currentJuz}</span> •{" "}
              <span className="font-semibold">Page {page}</span>
              <span className="opacity-70"> / {numPages || 1}</span>
              {surah ? <span className="opacity-70"> • Surah {surah}</span> : null}
            </div>
          </div>

          <div className="shrink-0 flex gap-2">
            <button
              onClick={() => {
                setShowBookmarks((v) => !v);
                setShowJump(false);
              }}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Bookmarks
            </button>
            <button
              onClick={() => {
                setShowJump((v) => !v);
                setShowBookmarks(false);
                setJumpJuz(currentJuz);
                setJumpPage(page);
              }}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Jump
            </button>
          </div>
        </div>

        {/* Juz / Page controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={goPrevJuz}
            disabled={currentJuz === 1}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              currentJuz === 1 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ◀ Juz
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
            Juz ▶
          </button>

          {/* ✅ Quick Juz jump */}
          <div className="ml-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/15 px-2 py-1.5">
            <div className="text-xs opacity-70">Go Juz</div>
            <input
              value={quickJuzInput}
              onChange={(e) => setQuickJuzInput(e.target.value)}
              inputMode="numeric"
              className="w-14 rounded-lg border border-white/15 bg-black/25 px-2 py-1 text-sm outline-none"
            />
            <button
              onClick={quickGoJuz}
              className="rounded-lg border border-white/15 bg-black/25 px-2 py-1 text-sm font-semibold hover:bg-black/35"
            >
              Go
            </button>
          </div>

          <div className="w-2" />

          <button
            onClick={goPrevPage}
            disabled={page <= 1}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              page <= 1 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ◀ Page
          </button>

          <button
            onClick={goNextPage}
            disabled={page >= (numPages || 1)}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              page >= (numPages || 1) ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Page ▶
          </button>

          <button
            onClick={addCurrentBookmark}
            className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            + Bookmark
          </button>
        </div>

        {/* Zoom row + Surah placeholder */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="text-xs opacity-70">Zoom</div>
          <button
            onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.08).toFixed(2)))}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            -
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.08).toFixed(2)))}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            +
          </button>

          {/* ✅ Surah placeholder */}
          <div className="ml-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/15 px-2 py-1.5">
            <div className="text-xs opacity-70">Surah</div>
            <input
              value={surahInput}
              onChange={(e) => setSurahInput(e.target.value)}
              inputMode="numeric"
              placeholder="1–114"
              className="w-16 rounded-lg border border-white/15 bg-black/25 px-2 py-1 text-sm outline-none"
            />
            <button
              onClick={saveSurahPlaceholder}
              className="rounded-lg border border-white/15 bg-black/25 px-2 py-1 text-sm font-semibold hover:bg-black/35"
            >
              Set
            </button>
          </div>

          <a
            href={current.path}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            Open PDF
          </a>
        </div>
      </div>

      {/* Jump sheet */}
      {showJump && (
        <div className="rounded-2xl border border-white/15 bg-black/25 p-4 mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold">Jump to</div>
              <div className="text-xs opacity-70 mt-1">Surah mapping will be added later.</div>
            </div>
            <button
              onClick={() => setShowJump(false)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="text-xs opacity-70 w-10">Juz</div>
            <input
              value={jumpJuz}
              onChange={(e) => setJumpJuz(e.target.value)}
              inputMode="numeric"
              className="w-20 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
            />
            <div className="text-xs opacity-70 w-12">Page</div>
            <input
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
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

          <div className="mt-2 text-xs opacity-65">
            Tip: You can also use the “Go Juz” box in the toolbar.
          </div>
        </div>
      )}

      {/* Bookmarks sheet */}
      {showBookmarks && (
        <div className="rounded-2xl border border-white/15 bg-black/25 p-4 mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-bold">Bookmarks</div>
              <div className="text-xs opacity-70 mt-1">Tap to open.</div>
            </div>
            <button
              onClick={() => setShowBookmarks(false)}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
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
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4 mt-3">
          <div className="font-semibold mb-1">Problem</div>
          <div className="text-sm opacity-85">{err}</div>
        </div>
      )}

      {/* PDF area fills remaining height */}
      <div
        ref={pdfHostRef}
        className="mt-3 flex-1 rounded-2xl border border-white/15 bg-black/20 overflow-hidden"
      >
        {/* Vertical scrolling happens here */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overflow-x-hidden bg-white p-2"
        >
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

        {/* Bottom toolbar (always visible) */}
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
            Juz-{currentJuz} • Page {page}/{numPages || 1}
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
