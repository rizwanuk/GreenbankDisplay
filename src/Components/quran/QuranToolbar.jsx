// src/Components/quran/QuranToolbar.jsx
import React from "react";

export default function QuranToolbar({
  currentJuz,
  currentPage,
  onOpenPicker,
  onOpenBookmarks,
  onPrev,
  onNext,
  onAddBookmark,
  pdfPath,
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-extrabold leading-tight">Qur’an</div>
          <div className="text-sm opacity-80 leading-snug mt-0.5">
            <span className="font-semibold">Juz-{currentJuz}</span>
            {currentPage ? <span className="opacity-80"> • Page {currentPage}</span> : null}
          </div>
        </div>

        <div className="shrink-0 flex gap-2">
          <button
            onClick={onOpenBookmarks}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            Bookmarks
          </button>
          <button
            onClick={onOpenPicker}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            Jump
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onPrev}
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
          onClick={onNext}
          disabled={currentJuz === 30}
          className={[
            "rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold",
            "bg-black/25 hover:bg-black/35",
            currentJuz === 30 ? "opacity-40 cursor-not-allowed" : "",
          ].join(" ")}
        >
          Next
        </button>

        <button
          onClick={onAddBookmark}
          className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
        >
          + Bookmark
        </button>

        <a
          href={pdfPath}
          target="_blank"
          rel="noreferrer"
          className="ml-auto rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
        >
          Open PDF
        </a>
      </div>
    </div>
  );
}
