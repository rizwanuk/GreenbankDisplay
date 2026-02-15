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

  // Use ONE sheet controller (instead of multiple big blocks)
  const [sheet, setSheet] = useState(null); // "jump" | "bookmarks" | null

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
      setTimeout(() => setPage(p), 0);
    } else {
      setPage(p);
    }

    setSheet(null);
  };

  const addCurrentBookmark = () => {
    addBookmark({
      juz: currentJuz,
      page,
      surah: surah || undefined,
      label: surah ? `Surah ${surah}` : undefined,
    });
    setSheet("bookmarks");
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
    setSheet(null);
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

  // Surah placeholder (saved only)
  const [surahInput, setSurahInput] = useState(surah ? String(surah) : "");
  useEffect(() => setSurahInput(surah ? String(surah) : ""), [surah]);

  const saveSurahPlaceholder = () => {
    const s = Number(surahInput);
    if (Number.isFinite(s) && s >= 1 && s <= 114) setSurah(s);
  };

  const canPrev = !(page <= 1 && currentJuz === 1);
  const canNext = !(page >= (numPages || 1) && currentJuz === 30);

  return (
    <div className="h-full flex flex-col p-3">
      {/* ✅ Slim top bar */}
      <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="text-sm font-extrabold leading-tight">Qur’an</div>
            <div className="text-[11px] opacity-80 leading-tight truncate">
              Juz-{currentJuz} • Page {page}/{numPages || 1}
              {surah ? <span className="opacity-70"> • Surah {surah}</span> : null}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSheet("bookmarks")}
              className="h-9 px-3 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-xs font-semibold"
            >
              Bookmarks
            </button>
            <button
              onClick={() => {
                setJumpJuz(currentJuz);
                setJumpPage(page);
                setSheet("jump");
              }}
              className="h-9 px-3 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-xs font-semibold"
            >
              Jump
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/20 px-3 py-2">
          <div className="text-xs font-semibold mb-0.5">Problem</div>
          <div className="text-xs opacity-85">{err}</div>
        </div>
      )}

      {/* ✅ PDF area takes the space */}
      <div
        ref={pdfHostRef}
        className="mt-2 flex-1 rounded-2xl border border-white/15 bg-black/20 overflow-hidden"
      >
        {/* scrolling only here */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overflow-x-hidden bg-white"
        >
          <div className="p-2">
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

        {/* ✅ Slim bottom nav (always visible, matches theme) */}
        <div className="border-t border-white/10 bg-black/40 backdrop-blur px-2 py-2 flex items-center gap-2">
          <button
            onClick={() => {
              if (page > 1) goPrevPage();
              else if (currentJuz > 1) {
                setCurrentJuz((j) => Math.max(1, j - 1));
                setTimeout(() => setPage(9999), 0);
              }
            }}
            disabled={!canPrev}
            className={[
              "h-10 px-3 rounded-xl border border-white/15 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              !canPrev ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ◀
          </button>

          <div className="text-xs font-semibold">
            Juz-{currentJuz} • {page}/{numPages || 1}
          </div>

          <button
            onClick={addCurrentBookmark}
            className="ml-auto h-10 px-3 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-xs font-semibold"
          >
            + Bookmark
          </button>

          <button
            onClick={() => {
              if (page < (numPages || 1)) goNextPage();
              else if (currentJuz < 30) setCurrentJuz((j) => Math.min(30, j + 1));
            }}
            disabled={!canNext}
            className={[
              "h-10 px-3 rounded-xl border border-white/15 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              !canNext ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            ▶
          </button>
        </div>
      </div>

      {/* ✅ Bottom sheet (Jump / Bookmarks) */}
      {sheet && (
        <BottomSheet title={sheet === "jump" ? "Jump" : "Bookmarks"} onClose={() => setSheet(null)}>
          {sheet === "jump" && (
            <div className="space-y-3">
              <div className="text-xs opacity-75">
                Surah mapping will be added later (placeholder saves only).
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Juz (1–30)">
                  <input
                    value={jumpJuz}
                    onChange={(e) => setJumpJuz(e.target.value)}
                    inputMode="numeric"
                    className="w-full h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm outline-none"
                  />
                </Field>

                <Field label={`Page (1–${numPages || 1})`}>
                  <input
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    inputMode="numeric"
                    className="w-full h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm outline-none"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Zoom">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.08).toFixed(2)))}
                      className="h-11 flex-1 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                    >
                      −
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.08).toFixed(2)))}
                      className="h-11 flex-1 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                    >
                      +
                    </button>
                  </div>
                </Field>

                <Field label="Surah (1–114)">
                  <div className="flex gap-2">
                    <input
                      value={surahInput}
                      onChange={(e) => setSurahInput(e.target.value)}
                      inputMode="numeric"
                      placeholder="1–114"
                      className="h-11 flex-1 rounded-xl border border-white/15 bg-black/25 px-3 text-sm outline-none"
                    />
                    <button
                      onClick={saveSurahPlaceholder}
                      className="h-11 px-4 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                    >
                      Set
                    </button>
                  </div>
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const j = Math.min(30, Math.max(1, Number(jumpJuz) || 1));
                    setCurrentJuz(j);
                  }}
                  className="h-11 px-4 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                >
                  ◀ Juz
                </button>

                <button
                  onClick={() => {
                    const j = Math.min(30, Math.max(1, Number(jumpJuz) || 1));
                    setCurrentJuz(j);
                    // page set in applyJump
                    setTimeout(() => applyJump(), 0);
                  }}
                  className="ml-auto h-11 px-5 rounded-xl border border-white/15 bg-white/15 hover:bg-white/20 text-sm font-semibold"
                >
                  Go
                </button>
              </div>

              <a
                href={current.path}
                target="_blank"
                rel="noreferrer"
                className="block text-center h-11 leading-[44px] rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
              >
                Open PDF
              </a>
            </div>
          )}

          {sheet === "bookmarks" && (
            <div className="space-y-3">
              {!bookmarks.length && <div className="text-sm opacity-80">No bookmarks yet.</div>}

              {bookmarks.length > 0 && (
                <div className="max-h-[45vh] overflow-auto space-y-2 pr-1">
                  {bookmarks.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <button onClick={() => openBookmark(b)} className="text-left min-w-0 flex-1">
                          <div className="text-sm font-semibold">
                            Juz-{b.juz} • Page {b.page}
                            {b.surah ? <span className="opacity-70"> • Surah {b.surah}</span> : null}
                          </div>
                          <div className="text-[11px] opacity-60 mt-0.5">
                            {new Date(b.createdAt).toLocaleString()}
                          </div>
                        </button>

                        <button
                          onClick={() => removeBookmark(b.id)}
                          className="shrink-0 h-10 px-3 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bookmarks.length > 0 && (
                <button
                  onClick={clearAll}
                  className="h-11 w-full rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

/* ---------------- Small UI helpers ---------------- */

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] opacity-70 mb-1">{label}</div>
      {children}
    </div>
  );
}

function BottomSheet({ title, onClose, children }) {
  // prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0">
        <div className="mx-3 mb-3 rounded-3xl border border-white/15 bg-black/70 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="text-sm font-extrabold">{title}</div>
            <button
              onClick={onClose}
              className="h-9 px-3 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
