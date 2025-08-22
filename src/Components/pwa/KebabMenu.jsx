// src/Components/pwa/KebabMenu.jsx
import React, { useEffect, useRef, useState } from "react";

export default function KebabMenu({
  canInstallMenu,
  installed,
  isIOS,
  isIOSSafari,
  onInstall,
  onNotifications,
  onCopyLink,
  notifStatusLabel = "—",
  notifStatusColor = "text-white/70",
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
            {/* Notifications row with status dot */}
            <button
              onClick={() => {
                setOpen(false);
                onNotifications?.();
              }}
              className="w-full text-left px-3 py-2 hover:bg-white/10 flex items-center justify-between"
            >
              <span>Notifications</span>
              <span className={`flex items-center gap-1 ${notifStatusColor}`}>
                <span className="inline-block h-2 w-2 rounded-full bg-current" />
                {notifStatusLabel}
              </span>
            </button>

            {/* Install */}
            {canInstallMenu && !installed && (
              <button
                onClick={() => {
                  setOpen(false);
                  onInstall?.();
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10"
              >
                Install app
              </button>
            )}

            {/* iOS hint / copy link for Safari */}
            {isIOS && !isIOSSafari && (
              <button
                onClick={() => {
                  setOpen(false);
                  onCopyLink?.();
                }}
                className="w-full text-left px-3 py-2 hover:bg-white/10"
              >
                Copy link for Safari (Install)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
