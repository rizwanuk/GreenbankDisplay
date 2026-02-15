// src/Components/quran/QuranBookmarksSheet.jsx
import React from "react";

export default function QuranBookmarksSheet({ open, onClose, bookmarks, onJumpToBookmark, onRemove, onClearAll }) {
  if (!open) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-black/25 p-4 mt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold">Bookmarks</div>
          <div className="text-xs opacity-70 mt-1">
            Tap a bookmark to open it. (Surah mapping can be enhanced later.)
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
        >
          Close
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {!bookmarks.length && <div className="text-sm opacity-80">No bookmarks yet.</div>}

        {bookmarks.map((b) => (
          <div key={b.id} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <button
                onClick={() => onJumpToBookmark(b)}
                className="text-left min-w-0 flex-1"
              >
                <div className="font-semibold">
                  Juz-{b.juz}
                  {b.page ? <span className="opacity-80"> • Page {b.page}</span> : null}
                  {b.surah ? <span className="opacity-70"> • Surah {b.surah}</span> : null}
                </div>
                {b.label ? <div className="text-sm opacity-80 mt-0.5">{b.label}</div> : null}
                <div className="text-xs opacity-60 mt-1">
                  {new Date(b.createdAt).toLocaleString()}
                </div>
              </button>

              <button
                onClick={() => onRemove(b.id)}
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
            onClick={onClearAll}
            className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm font-semibold hover:bg-black/35"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
