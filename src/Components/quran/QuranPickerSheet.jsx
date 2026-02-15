// src/Components/quran/QuranPickerSheet.jsx
import React, { useMemo, useState } from "react";

export default function QuranPickerSheet({ open, onClose, onJump }) {
  const [mode, setMode] = useState("juz"); // 'juz' | 'page' | 'surah'
  const [juz, setJuz] = useState(1);
  const [page, setPage] = useState("");
  const [surah, setSurah] = useState("");

  const juzOptions = useMemo(() => Array.from({ length: 30 }, (_, i) => i + 1), []);

  if (!open) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-4 mt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold">Jump to…</div>
          <div className="text-xs opacity-70 mt-1">
            Page + Surah mapping can be refined later. Juz jump works now.
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
        >
          Close
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {[
          ["juz", "Juz"],
          ["page", "Page"],
          ["surah", "Surah"],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={[
              "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
              mode === k ? "bg-white/20" : "bg-black/25 hover:bg-black/35",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {mode === "juz" && (
          <div className="flex items-center gap-2">
            <div className="text-xs opacity-70">Juz</div>
            <select
              value={juz}
              onChange={(e) => setJuz(Number(e.target.value))}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
            >
              {juzOptions.map((n) => (
                <option key={n} value={n}>
                  Juz-{n}
                </option>
              ))}
            </select>

            <button
              onClick={() => onJump({ juz })}
              className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
            >
              Go
            </button>
          </div>
        )}

        {mode === "page" && (
          <div className="space-y-2">
            <div className="text-xs opacity-70">
              Enter Juz and Page (adds <span className="opacity-90">#page=</span> to the PDF URL).
            </div>

            <div className="flex items-center gap-2">
              <select
                value={juz}
                onChange={(e) => setJuz(Number(e.target.value))}
                className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
              >
                {juzOptions.map((n) => (
                  <option key={n} value={n}>
                    Juz-{n}
                  </option>
                ))}
              </select>

              <input
                value={page}
                onChange={(e) => setPage(e.target.value)}
                inputMode="numeric"
                placeholder="Page #"
                className="w-28 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={() => onJump({ juz, page: Number(page) || undefined })}
                className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
              >
                Go
              </button>
            </div>
          </div>
        )}

        {mode === "surah" && (
          <div className="space-y-2">
            <div className="text-xs opacity-70">
              Surah jump will use a mapping later (Surah → Juz + Page). For now it stores the Surah number and opens the last-used Juz.
            </div>

            <div className="flex items-center gap-2">
              <input
                value={surah}
                onChange={(e) => setSurah(e.target.value)}
                inputMode="numeric"
                placeholder="Surah # (1–114)"
                className="w-44 rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={() => onJump({ surah: Number(surah) || undefined })}
                className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
              >
                Save / Go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
