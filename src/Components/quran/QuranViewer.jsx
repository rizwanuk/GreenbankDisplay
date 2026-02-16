// src/Components/quran/QuranViewer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PdfJsPage from "./PdfJsPage";
import { buildJuzList } from "../../utils/quranFiles";
import useQuranBookmarks from "../../hooks/useQuranBookmarks";

const LS_LAST_JUZ   = "gbm_quran_last_juz";
const LS_LAST_PAGE  = "gbm_quran_last_page";
const LS_LAST_ZOOM  = "gbm_quran_zoom";
const LS_LAST_SURAH = "gbm_quran_last_surah";

// ---------------------------------------------------------------------------
// Navigation is driven by a single { juz, page } state object so there are
// zero race conditions between juz, page, and numPages updates.
//
// The "jump to last page of previous juz" problem is solved with a ref flag
// (wantLastPageRef) that is consumed *inside* handleNumPages — the only place
// where numPages is known — instead of in a separate useEffect.
// ---------------------------------------------------------------------------

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export default function QuranViewer() {
  const juzList  = useMemo(() => buildJuzList(), []);
  const { bookmarks, addBookmark, removeBookmark, clearAll } = useQuranBookmarks();

  // ── Core navigation state ────────────────────────────────────────────────
  const [nav, setNav] = useState(() => {
    const juz  = clamp(Number(localStorage.getItem(LS_LAST_JUZ)  || 1), 1, 30);
    const page = clamp(Number(localStorage.getItem(LS_LAST_PAGE) || 1), 1, 9999);
    return {
      juz:  Number.isFinite(juz)  ? juz  : 1,
      page: Number.isFinite(page) ? page : 1,
    };
  });

  // numPages comes from the PDF; null = not yet loaded for current juz
  const [numPages, setNumPages] = useState(null);

  // When true, the NEXT handleNumPages call should land on the last page
  const wantLastPageRef = useRef(false);

  const [zoom, setZoom] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_ZOOM) || "1.0");
    return Number.isFinite(raw) ? clamp(raw, 0.7, 2.5) : 1.0;
  });

  const [surah, setSurah] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_SURAH) || "");
    return Number.isFinite(raw) && raw >= 1 && raw <= 114 ? raw : "";
  });

  const fitWidth = true;
  const [err, setErr] = useState("");
  const [rendering, setRendering] = useState(true);

  // ── Panel state ──────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState(null);
  const togglePanel = (name) => setActivePanel((v) => (v === name ? null : name));

  // Jump form inputs
  const [jumpJuz,  setJumpJuz]  = useState(nav.juz);
  const [jumpPage, setJumpPage] = useState(nav.page);

  const [quickJuzInput, setQuickJuzInput] = useState(String(nav.juz));
  const [surahInput,    setSurahInput]    = useState(surah ? String(surah) : "");

  // Scroll + sizing
  const scrollRef          = useRef(null);
  const [containerWidthPx, setContainerWidthPx] = useState(0);

  // Refs for stale-closure-safe access inside event handlers
  const navRef      = useRef(nav);
  const numPagesRef = useRef(numPages);
  useEffect(() => { navRef.current      = nav;      }, [nav]);
  useEffect(() => { numPagesRef.current = numPages; }, [numPages]);

  // Auto-advance throttle
  const lastAutoNavRef = useRef(0);

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => localStorage.setItem(LS_LAST_JUZ,  String(nav.juz)),  [nav.juz]);
  useEffect(() => localStorage.setItem(LS_LAST_PAGE, String(nav.page)), [nav.page]);
  useEffect(() => localStorage.setItem(LS_LAST_ZOOM, String(zoom)),     [zoom]);
  useEffect(() => {
    if (surah) localStorage.setItem(LS_LAST_SURAH, String(surah));
    else       localStorage.removeItem(LS_LAST_SURAH);
  }, [surah]);

  const current = useMemo(
    () => juzList.find((j) => j.n === nav.juz) || juzList[0],
    [juzList, nav.juz]
  );

  // ── Container width ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const measure = () =>
      setContainerWidthPx(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
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

  // ── Reset on juz change ──────────────────────────────────────────────────
  const prevJuzRef = useRef(nav.juz);
  useEffect(() => {
    if (nav.juz === prevJuzRef.current) return;
    prevJuzRef.current = nav.juz;
    setErr("");
    setNumPages(null);     // show "…" while loading
    setRendering(true);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [nav.juz]);

  // ── Scroll to top on page change ─────────────────────────────────────────
  const prevPageRef = useRef(nav.page);
  useEffect(() => {
    if (nav.page === prevPageRef.current) return;
    prevPageRef.current = nav.page;
    setRendering(true);
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    });
  }, [nav.page]);

  // ── PDF callbacks ────────────────────────────────────────────────────────
  const handleNumPages = useCallback((n) => {
    const total = Math.max(1, n || 1);
    setNumPages(total);

    if (wantLastPageRef.current) {
      // Going backwards across a juz boundary — land on the final page
      wantLastPageRef.current = false;
      setNav((prev) => ({ ...prev, page: total }));
    } else {
      // Clamp in case a saved/bookmarked page exceeds this juz's total
      setNav((prev) => ({ ...prev, page: clamp(prev.page, 1, total) }));
    }
  }, []);

  const handleError = useCallback((m) => {
    setErr(m || "Failed to render.");
    setRendering(false);
  }, []);

  const handleRendered = useCallback(() => setRendering(false), []);

  // ── Navigation ───────────────────────────────────────────────────────────
  // All navigation goes through setNav so juz + page are always atomic.

  // Move back one page; crosses juz boundary if needed
  const goPrevPage = useCallback(() => {
    const { juz, page } = navRef.current;
    if (page > 1) {
      setNav({ juz, page: page - 1 });
    } else if (juz > 1) {
      // Cross boundary backwards — land on last page of previous juz
      wantLastPageRef.current = true;
      setNav({ juz: juz - 1, page: 1 }); // page corrected by handleNumPages
    }
  }, []);

  // Move forward one page; crosses juz boundary if needed
  const goNextPage = useCallback(() => {
    const { juz, page } = navRef.current;
    const total = numPagesRef.current || 1;
    if (page < total) {
      setNav({ juz, page: page + 1 });
    } else if (juz < 30) {
      // Cross boundary forwards — start at page 1 of next juz
      wantLastPageRef.current = false;
      setNav({ juz: juz + 1, page: 1 });
    }
  }, []);

  // Jump directly to start of a different juz (backwards = last page)
  const goPrevJuz = useCallback(() => {
    const { juz } = navRef.current;
    if (juz <= 1) return;
    wantLastPageRef.current = true;
    setNav({ juz: juz - 1, page: 1 });
  }, []);

  const goNextJuz = useCallback(() => {
    const { juz } = navRef.current;
    if (juz >= 30) return;
    wantLastPageRef.current = false;
    setNav({ juz: juz + 1, page: 1 });
  }, []);

  // Quick juz jump from Controls panel input
  const quickGoJuz = useCallback(() => {
    const j = clamp(Number(quickJuzInput) || 1, 1, 30);
    wantLastPageRef.current = false;
    setNav({ juz: j, page: 1 });
    setActivePanel(null);
  }, [quickJuzInput]);

  // Jump panel — juz + page
  const applyJump = useCallback(() => {
    setErr("");
    const j = clamp(Number(jumpJuz)  || 1, 1, 30);
    const p = Math.max(1, Number(jumpPage) || 1);
    wantLastPageRef.current = false;
    setNav({ juz: j, page: p });
    setActivePanel(null);
  }, [jumpJuz, jumpPage]);

  // Bookmarks
  const addCurrentBookmark = useCallback(() => {
    addBookmark({
      juz:   navRef.current.juz,
      page:  navRef.current.page,
      surah: surah || undefined,
      label: surah ? `Surah ${surah}` : undefined,
    });
    setActivePanel("bookmarks");
  }, [addBookmark, surah]);

  const openBookmark = useCallback((b) => {
    setErr("");
    wantLastPageRef.current = false;
    setNav({ juz: b.juz, page: Math.max(1, Number(b.page) || 1) });
    if (b.surah) setSurah(b.surah);
    setActivePanel(null);
  }, []);

  // Surah label
  const saveSurahPlaceholder = useCallback(() => {
    const s = Number(surahInput);
    if (Number.isFinite(s) && s >= 1 && s <= 114) setSurah(s);
  }, [surahInput]);

  // ── Auto-advance on scroll (stable, uses refs only) ──────────────────────
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const now = Date.now();
    if (now - lastAutoNavRef.current < 800) return;

    const threshold = 32;
    const atBottom  = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    const atTop     = el.scrollTop <= threshold;
    if (!atBottom && !atTop) return;

    const { juz, page } = navRef.current;
    const total = numPagesRef.current || 1;

    if (atBottom) {
      if (page < total) {
        lastAutoNavRef.current = now;
        setNav({ juz, page: page + 1 });
      } else if (juz < 30) {
        lastAutoNavRef.current = now;
        wantLastPageRef.current = false;
        setNav({ juz: juz + 1, page: 1 });
      }
    } else if (atTop) {
      if (page > 1) {
        lastAutoNavRef.current = now;
        setNav({ juz, page: page - 1 });
      } else if (juz > 1) {
        lastAutoNavRef.current = now;
        wantLastPageRef.current = true;
        setNav({ juz: juz - 1, page: 1 });
      }
    }
  }, []); // intentionally empty deps — uses refs

  const onEnter = (e, fn) => { if (e.key === "Enter") fn(); };

  // Disabled states
  const atVeryStart = nav.juz === 1  && nav.page <= 1;
  const atVeryEnd   = nav.juz === 30 && nav.page >= (numPages || 1);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full min-h-0 flex flex-col">

      {/* ── Top toolbar ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 mx-2 mt-1">
        <div className="flex items-center gap-1.5">

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold leading-tight opacity-90">Qur'an</div>
            <div className="text-[11px] opacity-70 leading-tight mt-0.5">
              Juz-{nav.juz}&nbsp;·&nbsp;Page&nbsp;
              <span className="font-semibold text-white/90">{nav.page}</span>
              /{numPages ?? "…"}
              {surah ? <span className="opacity-60"> · S{surah}</span> : null}
            </div>
          </div>

          {[
            { key: "controls",  label: "Controls"  },
            { key: "bookmarks", label: "Bookmarks" },
            { key: "jump",      label: "Jump"       },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "jump") { setJumpJuz(nav.juz); setJumpPage(nav.page); }
                togglePanel(key);
              }}
              className={[
                "rounded-xl border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold transition",
                activePanel === key
                  ? "bg-white/20 text-white"
                  : "bg-black/25 hover:bg-black/35 text-white/90",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panels ────────────────────────────────────────────────────── */}
      {activePanel && (
        <div className="mx-2 mt-1.5 rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md p-3 text-white/90">

          {activePanel === "controls" && (
            <>
              <PanelHeader title="Controls" onClose={() => setActivePanel(null)} />

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <PanelBtn onClick={goPrevJuz} disabled={nav.juz <= 1}>◀ Prev Juz</PanelBtn>
                <PanelBtn onClick={goNextJuz} disabled={nav.juz >= 30}>Next Juz ▶</PanelBtn>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs opacity-60 w-12 shrink-0">Go Juz</span>
                <input
                  value={quickJuzInput}
                  onChange={(e) => setQuickJuzInput(e.target.value)}
                  onKeyDown={(e) => onEnter(e, quickGoJuz)}
                  inputMode="numeric"
                  className="w-14 rounded-lg border border-white/15 bg-black/25 px-2 py-1.5 text-sm outline-none"
                />
                <PanelBtn onClick={quickGoJuz}>Go</PanelBtn>
                <span className="ml-auto text-xs opacity-60 shrink-0">Zoom</span>
                <PanelBtn onClick={() => setZoom((z) => clamp(+(z - 0.1).toFixed(2), 0.7, 2.2))}>−</PanelBtn>
                <span className="text-xs font-semibold w-9 text-center shrink-0">
                  {Math.round(zoom * 100)}%
                </span>
                <PanelBtn onClick={() => setZoom((z) => clamp(+(z + 0.1).toFixed(2), 0.7, 2.2))}>+</PanelBtn>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs opacity-60 w-12 shrink-0">Surah</span>
                <input
                  value={surahInput}
                  onChange={(e) => setSurahInput(e.target.value)}
                  onKeyDown={(e) => onEnter(e, saveSurahPlaceholder)}
                  inputMode="numeric"
                  placeholder="1–114"
                  className="w-16 rounded-lg border border-white/15 bg-black/25 px-2 py-1.5 text-sm outline-none"
                />
                <PanelBtn onClick={saveSurahPlaceholder}>Set</PanelBtn>
                <a
                  href={current.path}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto rounded-xl border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs font-semibold hover:bg-black/35"
                >
                  Open PDF ↗
                </a>
              </div>

              <div className="mt-2">
                <button
                  onClick={addCurrentBookmark}
                  className="w-full rounded-xl border border-white/15 bg-black/20 hover:bg-black/30 px-3 py-2 text-xs font-semibold"
                >
                  + Bookmark this page
                </button>
              </div>
            </>
          )}

          {activePanel === "jump" && (
            <>
              <PanelHeader title="Jump to…" onClose={() => setActivePanel(null)} />
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs opacity-60 w-8 shrink-0">Juz</span>
                <input
                  value={jumpJuz}
                  onChange={(e) => setJumpJuz(e.target.value)}
                  onKeyDown={(e) => onEnter(e, applyJump)}
                  inputMode="numeric"
                  className="w-16 rounded-xl border border-white/15 bg-black/25 px-2.5 py-1.5 text-sm outline-none"
                />
                <span className="text-xs opacity-60 w-10 shrink-0">Page</span>
                <input
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => onEnter(e, applyJump)}
                  inputMode="numeric"
                  className="w-16 rounded-xl border border-white/15 bg-black/25 px-2.5 py-1.5 text-sm outline-none"
                />
                <PanelBtn onClick={applyJump} className="ml-auto">Go</PanelBtn>
              </div>
            </>
          )}

          {activePanel === "bookmarks" && (
            <>
              <PanelHeader title="Bookmarks" onClose={() => setActivePanel(null)} />
              <div className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto">
                {!bookmarks.length && (
                  <div className="text-xs opacity-60 py-2">
                    No bookmarks yet — open Controls and tap "+ Bookmark this page".
                  </div>
                )}
                {bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 flex items-center gap-2"
                  >
                    <button onClick={() => openBookmark(b)} className="flex-1 text-left min-w-0">
                      <div className="text-xs font-semibold leading-tight">
                        Juz-{b.juz} · Page {b.page}
                        {b.surah ? <span className="opacity-60"> · S{b.surah}</span> : null}
                      </div>
                      <div className="text-[10px] opacity-50 mt-0.5">
                        {new Date(b.createdAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      onClick={() => removeBookmark(b.id)}
                      className="shrink-0 text-[10px] px-2 py-1 rounded-lg border border-white/10 bg-black/20 hover:bg-black/35 font-semibold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {bookmarks.length > 0 && (
                <button
                  onClick={clearAll}
                  className="mt-2 rounded-xl border border-white/15 bg-black/20 hover:bg-black/30 px-3 py-1.5 text-xs font-semibold"
                >
                  Clear all
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {err && (
        <div className="mx-2 mt-1.5 rounded-2xl border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          <span className="font-semibold">Error: </span>{err}
        </div>
      )}

      {/* ── PDF viewer ────────────────────────────────────────────────── */}
      <div className="mx-2 mt-1.5 mb-0 flex-1 min-h-0 rounded-2xl border border-white/10 overflow-hidden flex flex-col bg-white">

        {/* Scrollable page — relative so spinner overlay works */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-white/60">
              <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            </div>
          )}

          <PdfJsPage
            url={current.path}
            pageNumber={nav.page}
            zoom={zoom}
            fitWidth={fitWidth}
            containerWidthPx={containerWidthPx}
            onNumPages={handleNumPages}
            onError={handleError}
            onRendered={handleRendered}
          />
        </div>

        {/* ── Bottom nav ────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 bg-gray-50 px-2 py-1.5 flex items-center gap-2 shrink-0">

          <button
            onClick={goPrevPage}
            disabled={atVeryStart}
            className={[
              "rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold",
              "bg-white hover:bg-gray-100 text-gray-700 shadow-sm transition active:scale-95",
              atVeryStart ? "opacity-35 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ◀ Prev
          </button>

          {/* Tappable centre — opens Jump panel */}
          <button
            onClick={() => { setJumpJuz(nav.juz); setJumpPage(nav.page); togglePanel("jump"); }}
            className="flex-1 text-center py-1 rounded-xl hover:bg-gray-100 transition"
          >
            <div className="text-[11px] font-bold text-gray-700 leading-tight">
              Juz-{nav.juz}
            </div>
            <div className="text-[10px] text-gray-500 leading-tight">
              {nav.page} / {numPages ?? "…"}
            </div>
          </button>

          <button
            onClick={goNextPage}
            disabled={atVeryEnd}
            className={[
              "rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold",
              "bg-white hover:bg-gray-100 text-gray-700 shadow-sm transition active:scale-95",
              atVeryEnd ? "opacity-35 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Next ▶
          </button>
        </div>
      </div>

      <div className="h-2 shrink-0" />
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold">{title}</span>
      <button
        onClick={onClose}
        className="rounded-xl border border-white/15 bg-black/25 px-2.5 py-1 text-xs font-semibold hover:bg-black/35"
      >
        Close
      </button>
    </div>
  );
}

function PanelBtn({ onClick, disabled = false, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs font-semibold",
        "hover:bg-black/35 transition active:scale-95",
        disabled ? "opacity-35 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
