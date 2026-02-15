// src/Components/QuranViewer.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * Quran Viewer (PDF-based)
 * Reads local PDFs from /public/quran/
 *
 * Expected filenames:
 *   public/quran/Juz-1.pdf
 *   public/quran/Juz-2.pdf
 *   ...
 *   public/quran/Juz-30.pdf
 *
 * Served URLs become:
 *   /quran/Juz-1.pdf ... /quran/Juz-30.pdf
 */

const LS_LAST_JUZ = "gbm_quran_last_juz";

function buildJuzList() {
  return Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return {
      n,
      label: `Juz-${n}`,
      // IMPORTANT: include .pdf (even if Explorer hides extensions)
      path: `/quran/Juz-${n}.pdf`,
    };
  });
}

export default function QuranViewer() {
  const juzList = useMemo(() => buildJuzList(), []);

  const [currentJuz, setCurrentJuz] = useState(() => {
    const raw = Number(localStorage.getItem(LS_LAST_JUZ) || "1");
    if (!Number.isFinite(raw)) return 1;
    return Math.min(30, Math.max(1, raw));
  });

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    localStorage.setItem(LS_LAST_JUZ, String(currentJuz));
  }, [currentJuz]);

  const current = useMemo(
    () => juzList.find((j) => j.n === currentJuz) || juzList[0],
    [juzList, currentJuz]
  );

  const goPrev = () => setCurrentJuz((n) => Math.max(1, n - 1));
  const goNext = () => setCurrentJuz((n) => Math.min(30, n + 1));

  // Add PDF viewer hints (works in many browsers)
  const pdfUrl = useMemo(() => {
    // Encode just in case (though there are no spaces)
    const base = encodeURI(current.path);
    // Toolbar hints: some viewers respect these, some ignore
    return `${base}#toolbar=0&navpanes=0&scrollbar=1`;
  }, [current.path]);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-extrabold leading-tight">Qur’an</div>
            <div className="text-sm opacity-80 leading-snug mt-0.5">
              Read by Juz (PDF) — loaded from <span className="opacity-90">/public/quran</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-base font-bold leading-none">{current.label}</div>
            <div className="text-xs opacity-60 mt-1">of 30</div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={goPrev}
            disabled={currentJuz === 1}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              currentJuz === 1 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Prev
          </button>

          <button
            onClick={goNext}
            disabled={currentJuz === 30}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              "bg-black/25 hover:bg-black/35",
              currentJuz === 30 ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            Next
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs opacity-70">Jump to</div>
            <select
              value={currentJuz}
              onChange={(e) => {
                setLoadError("");
                setCurrentJuz(Number(e.target.value));
              }}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none focus:border-white/30"
            >
              {juzList.map((j) => (
                <option key={j.n} value={j.n}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error panel (if iframe fails) */}
      {loadError && (
        <div className="rounded-2xl border border-white/15 bg-black/20 p-4 mb-3">
          <div className="font-semibold mb-1">Couldn’t load PDF</div>
          <div className="text-sm opacity-85">{loadError}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={current.path}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
      )}

      {/* PDF container */}
      <div className="rounded-2xl border border-white/15 bg-black/20 overflow-hidden">
        <div className="h-[calc(100vh-260px)]">
          <iframe
            key={current.path}
            title={current.label}
            src={pdfUrl}
            className="w-full h-full"
            style={{ border: 0 }}
            onError={() => setLoadError(`Tried ${current.path} — check the file exists and name matches exactly.`)}
            onLoad={() => setLoadError("")}
          />
        </div>
      </div>

      {/* Quick hint */}
      <div className="mt-3 text-xs opacity-65">
        If a Juz shows blank, confirm the filename is exactly: <span className="opacity-90">Juz-#.pdf</span> (capital J, hyphen),
        and it’s inside <span className="opacity-90">public/quran</span>.
      </div>
    </div>
  );
}
