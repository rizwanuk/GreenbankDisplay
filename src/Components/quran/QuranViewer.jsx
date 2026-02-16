// src/Components/quran/QuranViewer.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import PdfJsPage from "./PdfJsPage";
import { buildJuzList } from "../../utils/quranFiles";
import useQuranBookmarks from "../../hooks/useQuranBookmarks";

const LS_LAST_JUZ   = "gbm_quran_last_juz";
const LS_LAST_PAGE  = "gbm_quran_last_page";
const LS_LAST_ZOOM  = "gbm_quran_zoom";

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// ─────────────────────────────────────────────────────────────────────────────
// Juz Roller
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_H = 44;

function JuzRoller({ value, onChange }) {
  const items   = Array.from({ length: 30 }, (_, i) => i + 1);
  const listRef = useRef(null);
  const snapTimer = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: (value - 1) * ITEM_H, behavior: "smooth" });
  }, [value]);

  const onScroll = () => {
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      const idx     = Math.round(el.scrollTop / ITEM_H);
      const clamped = clamp(idx + 1, 1, 30);
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      if (clamped !== value) onChange(clamped);
    }, 120);
  };

  return (
    <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
      {/* Selection stripe */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: "50%", transform: "translateY(-50%)",
        height: ITEM_H,
        borderTop: "1px solid rgba(255,255,255,0.2)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.08)",
        pointerEvents: "none", zIndex: 2,
      }} />
      {/* Fade top */}
      <div style={{
        position: "absolute", inset: 0, top: 0, height: 70,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />
      {/* Fade bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 70,
        background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
        pointerEvents: "none", zIndex: 3,
      }} />

      <div
        ref={listRef}
        onScroll={onScroll}
        style={{
          height: "100%",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((n) => (
          <div
            key={n}
            onClick={() => onChange(n)}
            style={{
              height: ITEM_H,
              scrollSnapAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: n === value ? 18 : 15,
              fontWeight: n === value ? 700 : 500,
              color: n === value ? "#ffffff" : "rgba(255,255,255,0.4)",
              transition: "all 0.15s",
            }}
          >
            Juz {n}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main QuranViewer
// ─────────────────────────────────────────────────────────────────────────────
export default function QuranViewer() {
  const juzList  = useMemo(() => buildJuzList(), []);
  const { bookmarks, addBookmark, removeBookmark, clearAll } = useQuranBookmarks();

  const [nav, setNav] = useState(() => {
    const juz  = clamp(Number(localStorage.getItem(LS_LAST_JUZ)  || 1), 1, 30);
    const page = clamp(Number(localStorage.getItem(LS_LAST_PAGE) || 1), 1, 9999);
    return {
      juz:  Number.isFinite(juz)  ? juz  : 1,
      page: Number.isFinite(page) ? page : 1,
    };
  });

  const [numPages,  setNumPages]  = useState(null);
  const [zoom,      setZoom]      = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_ZOOM) || "1.0");
    return Number.isFinite(raw) ? clamp(raw, 0.7, 2.0) : 1.0;
  });

  const wantLastPageRef = useRef(false);
  const navRef          = useRef(nav);
  const numPagesRef     = useRef(numPages);
  useEffect(() => { navRef.current      = nav;      }, [nav]);
  useEffect(() => { numPagesRef.current = numPages; }, [numPages]);

  const [sheet,     setSheet]     = useState(null);
  const [rollerJuz, setRollerJuz] = useState(nav.juz);
  const [jumpPage,  setJumpPage]  = useState(String(nav.page));
  const [err,       setErr]       = useState("");
  const [rendering, setRendering] = useState(true);

  // Measure toolbar height so PDF area gets exactly the remaining space
  const toolbarRef  = useRef(null);
  const sheetRef    = useRef(null);
  const bottomRef   = useRef(null);
  const [toolbarH,  setToolbarH]  = useState(0);
  const [sheetH,    setSheetH]    = useState(0);
  const [bottomH,   setBottomH]   = useState(0);

  const measureAll = useCallback(() => {
    if (toolbarRef.current)  setToolbarH(toolbarRef.current.getBoundingClientRect().height);
    if (sheetRef.current)    setSheetH(sheetRef.current.getBoundingClientRect().height);
    else                     setSheetH(0);
    if (bottomRef.current)   setBottomH(bottomRef.current.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    measureAll();
    const ro = new ResizeObserver(measureAll);
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    if (bottomRef.current)  ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [measureAll]);

  useEffect(() => {
    measureAll();
    const ro = new ResizeObserver(measureAll);
    if (sheetRef.current) ro.observe(sheetRef.current);
    return () => ro.disconnect();
  }, [sheet, measureAll]);

  // Persist
  useEffect(() => localStorage.setItem(LS_LAST_JUZ,  String(nav.juz)),  [nav.juz]);
  useEffect(() => localStorage.setItem(LS_LAST_PAGE, String(nav.page)), [nav.page]);
  useEffect(() => localStorage.setItem(LS_LAST_ZOOM, String(zoom)),     [zoom]);

  const current = useMemo(
    () => juzList.find((j) => j.n === nav.juz) || juzList[0],
    [juzList, nav.juz]
  );

  const scrollRef   = useRef(null);
  const lastAutoRef = useRef(0);

  const prevJuzRef = useRef(nav.juz);
  useEffect(() => {
    if (nav.juz === prevJuzRef.current) return;
    prevJuzRef.current = nav.juz;
    setErr(""); setNumPages(null); setRendering(true);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; });
  }, [nav.juz]);

  const prevPageRef = useRef(nav.page);
  useEffect(() => {
    if (nav.page === prevPageRef.current) return;
    prevPageRef.current = nav.page;
    setRendering(true);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; });
  }, [nav.page]);

  const handleNumPages = useCallback((n) => {
    const total = Math.max(1, n || 1);
    setNumPages(total);
    if (wantLastPageRef.current) {
      wantLastPageRef.current = false;
      setNav((prev) => ({ ...prev, page: total }));
    } else {
      setNav((prev) => ({ ...prev, page: clamp(prev.page, 1, total) }));
    }
  }, []);

  const handleError    = useCallback((m) => { setErr(m || "Failed to render."); setRendering(false); }, []);
  const handleRendered = useCallback(() => setRendering(false), []);

  const goPrevPage = useCallback(() => {
    const { juz, page } = navRef.current;
    if (page > 1) { setNav({ juz, page: page - 1 }); }
    else if (juz > 1) { wantLastPageRef.current = true; setNav({ juz: juz - 1, page: 1 }); }
  }, []);

  const goNextPage = useCallback(() => {
    const { juz, page } = navRef.current;
    const total = numPagesRef.current || 1;
    if (page < total) { setNav({ juz, page: page + 1 }); }
    else if (juz < 30) { wantLastPageRef.current = false; setNav({ juz: juz + 1, page: 1 }); }
  }, []);

  const applyJuzRoller = useCallback((j) => {
    wantLastPageRef.current = false;
    setNav({ juz: j, page: 1 });
    setSheet(null);
  }, []);

  const applyPageJump = useCallback(() => {
    const p = clamp(Number(jumpPage) || 1, 1, numPagesRef.current || 1);
    setNav((prev) => ({ ...prev, page: p }));
    setSheet(null);
  }, [jumpPage]);

  const addCurrentBookmark = useCallback(() => {
    addBookmark({ juz: navRef.current.juz, page: navRef.current.page });
    setSheet("bm");
  }, [addBookmark]);

  const openBookmark = useCallback((b) => {
    wantLastPageRef.current = false;
    setNav({ juz: b.juz, page: Math.max(1, Number(b.page) || 1) });
    setSheet(null);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = Date.now();
    if (now - lastAutoRef.current < 800) return;
    const th = 32;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - th;
    const atTop    = el.scrollTop <= th;
    if (!atBottom && !atTop) return;
    const { juz, page } = navRef.current;
    const total = numPagesRef.current || 1;
    if (atBottom) {
      if (page < total) { lastAutoRef.current = now; setNav({ juz, page: page + 1 }); }
      else if (juz < 30) { lastAutoRef.current = now; wantLastPageRef.current = false; setNav({ juz: juz + 1, page: 1 }); }
    } else {
      if (page > 1) { lastAutoRef.current = now; setNav({ juz, page: page - 1 }); }
      else if (juz > 1) { lastAutoRef.current = now; wantLastPageRef.current = true; setNav({ juz: juz - 1, page: 1 }); }
    }
  }, []);

  const atVeryStart = nav.juz === 1  && nav.page <= 1;
  const atVeryEnd   = nav.juz === 30 && nav.page >= (numPages || 1);
  const onEnter     = (e, fn) => { if (e.key === "Enter") fn(); };

  // PDF area height = 100% minus toolbar, sheet, bottom bar, and small gaps
  const GAPS      = 8 + 8 + 8; // mt-1 + mt-1.5 + mb-2 approx in px
  const pdfAreaH  = `calc(100% - ${toolbarH + sheetH + bottomH + GAPS}px)`;

  return (
    // Use 100% width+height via inline styles — no Tailwind flex chain needed
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div ref={toolbarRef} className="mx-2 mt-1 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold leading-tight opacity-90">Qur'an</div>
            <div className="text-[11px] opacity-70 leading-tight mt-0.5">
              Juz-{nav.juz}&nbsp;·&nbsp;Page&nbsp;
              <span className="font-semibold text-white/90">{nav.page}</span>
              /{numPages ?? "…"}
            </div>
          </div>
          <ToolBtn active={sheet === "juz"}  onClick={() => { setRollerJuz(nav.juz); setSheet(sheet === "juz"  ? null : "juz");  }}>Juz</ToolBtn>
          <ToolBtn active={sheet === "jump"} onClick={() => { setJumpPage(String(nav.page)); setSheet(sheet === "jump" ? null : "jump"); }}>Page</ToolBtn>
          <ToolBtn active={sheet === "bm"}   onClick={() => setSheet(sheet === "bm" ? null : "bm")}>🔖</ToolBtn>
          <ToolBtn onClick={() => setZoom((z) => clamp(+(z - 0.1).toFixed(2), 0.7, 2.0))}>−</ToolBtn>
          <span className="text-[10px] font-semibold text-white/70 w-8 text-center shrink-0">{Math.round(zoom * 100)}%</span>
          <ToolBtn onClick={() => setZoom((z) => clamp(+(z + 0.1).toFixed(2), 0.7, 2.0))}>+</ToolBtn>
        </div>
      </div>

      {/* ── Sheet (Juz / Page / Bookmarks) ────────────────────────────── */}
      {sheet && (
        <div ref={sheetRef} className="mx-2 mt-1.5 rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md overflow-hidden shrink-0">

          {sheet === "juz" && (
            <>
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="text-sm font-bold text-white/90">Select Juz</span>
                <button onClick={() => setSheet(null)} className="text-xs text-white/60 hover:text-white/90 px-2 py-1 rounded-lg border border-white/10 bg-black/20">Done</button>
              </div>
              <JuzRoller value={rollerJuz} onChange={(j) => { setRollerJuz(j); applyJuzRoller(j); }} />
            </>
          )}

          {sheet === "jump" && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white/90">Go to page</span>
                <button onClick={() => setSheet(null)} className="text-xs text-white/60 px-2 py-1 rounded-lg border border-white/10 bg-black/20">Close</button>
              </div>
              <div className="flex gap-2">
                <input
                  value={jumpPage}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => onEnter(e, applyPageJump)}
                  inputMode="numeric"
                  placeholder={`1 – ${numPages ?? "?"}`}
                  className="flex-1 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                />
                <button onClick={applyPageJump} className="rounded-xl border border-white/20 bg-white/15 hover:bg-white/20 px-4 py-2 text-sm font-bold text-white">Go</button>
              </div>
              <div className="mt-1 text-[10px] text-white/40">Juz-{nav.juz} has {numPages ?? "…"} pages</div>
            </div>
          )}

          {sheet === "bm" && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white/90">Bookmarks</span>
                <div className="flex gap-1.5">
                  <button onClick={addCurrentBookmark} className="text-xs text-white/80 px-2 py-1 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20">+ Save here</button>
                  <button onClick={() => setSheet(null)} className="text-xs text-white/60 px-2 py-1 rounded-lg border border-white/10 bg-black/20">Close</button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {!bookmarks.length && <div className="text-xs text-white/40 py-2 text-center">No bookmarks yet.</div>}
                {bookmarks.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <button onClick={() => openBookmark(b)} className="flex-1 text-left">
                      <div className="text-xs font-semibold text-white/90">Juz-{b.juz} · Page {b.page}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{new Date(b.createdAt).toLocaleDateString()}</div>
                    </button>
                    <button onClick={() => removeBookmark(b.id)} className="text-white/30 hover:text-white/70 px-1">✕</button>
                  </div>
                ))}
              </div>
              {bookmarks.length > 0 && (
                <button onClick={clearAll} className="mt-2 text-[10px] text-white/30 hover:text-white/60">Clear all</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {err && (
        <div className="mx-2 mt-1.5 rounded-2xl border border-red-400/30 bg-red-900/20 px-3 py-2 text-xs text-red-300 shrink-0">
          <span className="font-semibold">Error: </span>{err}
        </div>
      )}

      {/* ── PDF card — takes ALL remaining height explicitly ──────────── */}
      <div
        className="mx-2 mt-1.5 mb-2 rounded-2xl border border-white/10 bg-white overflow-hidden"
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {/* Scrollable page area */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", position: "relative", WebkitOverflowScrolling: "touch" }}
        >
          {rendering && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.8)", zIndex: 10, pointerEvents: "none" }}>
              <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
            </div>
          )}
          <PdfJsPage
            url={current.path}
            pageNumber={nav.page}
            zoom={zoom}
            onNumPages={handleNumPages}
            onError={handleError}
            onRendered={handleRendered}
          />
        </div>

        {/* Bottom nav */}
        <div
          ref={bottomRef}
          style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb", padding: "6px 8px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
        >
          <button onClick={goPrevPage} disabled={atVeryStart} className={["rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 shadow-sm transition active:scale-95", atVeryStart ? "opacity-30 cursor-not-allowed" : ""].join(" ")}>
            ◀ Prev
          </button>

          <button
            onClick={() => { setRollerJuz(nav.juz); setSheet(sheet === "juz" ? null : "juz"); }}
            style={{ flex: 1, textAlign: "center", padding: "4px", borderRadius: 12 }}
            className="hover:bg-gray-100 transition"
          >
            <div className="text-[11px] font-bold text-gray-700 leading-tight">Juz-{nav.juz}</div>
            <div className="text-[10px] text-gray-400 leading-tight">{nav.page} / {numPages ?? "…"}</div>
          </button>

          <button onClick={goNextPage} disabled={atVeryEnd} className={["rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 shadow-sm transition active:scale-95", atVeryEnd ? "opacity-30 cursor-not-allowed" : ""].join(" ")}>
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, active = false, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-95 shrink-0",
        active ? "border-white/30 bg-white/20 text-white" : "border-white/15 bg-black/25 hover:bg-black/35 text-white/80",
      ].join(" ")}
    >
      {children}
    </button>
  );
}