// src/Components/pwa/KebabMenu.jsx
import React, { useEffect, useRef, useState } from "react";

export default function KebabMenu({
  canInstallMenu,
  installed,
  isIOS,
  isIOSSafari,
  onInstall,
  onCopyLink,
  debugEnabled = false,
  onToggleDebug = null,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-white/15 bg-white/10 px-2 py-1 hover:bg-white/15"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-white/10 bg-[#121827] shadow-xl overflow-hidden">
          <div className="py-1 text-sm">
            {/* Install */}
            {canInstallMenu && (
              <button
                onClick={() => {
                  setOpen(false);
                  onInstall?.();
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10"
              >
                {installed ? "Reinstall app" : "Install app"}
                {isIOS && isIOSSafari && (
                  <span className="block text-xs text-white/60">
                    iOS: use Share → Add to Home Screen
                  </span>
                )}
              </button>
            )}

            {/* Copy link */}
            <button
              onClick={() => {
                setOpen(false);
                onCopyLink?.();
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/10"
            >
              Copy link
            </button>

            {/* Debug */}
            {onToggleDebug && (
              <button
                onClick={() => {
                  setOpen(false);
                  onToggleDebug?.(!debugEnabled);
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10"
              >
                {debugEnabled ? "Disable debug mode" : "Enable debug mode"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
