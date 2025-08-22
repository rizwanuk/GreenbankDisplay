// src/Components/pwa/KebabMenu.jsx
import React, { useEffect, useRef, useState } from "react";

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    function onClick(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [ref, handler]);
}

export default function KebabMenu({
  canInstallMenu,
  installed,
  isIOS,
  isIOSSafari,
  onInstall,
  onNotifications,
  onCopyLink,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="More"
        onClick={() => setOpen((s) => !s)}
        className="p-2 -mr-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/10 bg-[#121827] shadow-xl overflow-hidden z-20">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-white/60 border-b border-white/10">
            Menu
          </div>

          {canInstallMenu && !installed && (
            <button
              onClick={() => {
                setOpen(false);
                onInstall?.();
              }}
              className="w-full text-left px-4 py-3 hover:bg-white/5"
            >
              Install app
              <div className="text-xs text-white/60">Add to Home Screen</div>
            </button>
          )}

          {!canInstallMenu && !installed && isIOS && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  alert("Open in Safari, then Share → Add to Home Screen.");
                }}
                className="w-full text-left px-4 py-3 hover:bg-white/5"
              >
                How to install (iOS)
                <div className="text-xs text-white/60">Open in Safari to install</div>
              </button>
              <button
                onClick={async () => {
                  setOpen(false);
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    alert("Link copied. Open it in Safari to install.");
                  } catch {
                    onCopyLink?.();
                  }
                }}
                className="w-full text-left px-4 py-3 hover:bg-white/5"
              >
                Copy link for Safari
              </button>
            </>
          )}

          <button
            onClick={() => {
              setOpen(false);
              onNotifications?.();
            }}
            className="w-full text-left px-4 py-3 hover:bg-white/5"
          >
            Notifications
            <div className="text-xs text-white/60">Enable or disable alerts</div>
          </button>
        </div>
      )}
    </div>
  );
}
