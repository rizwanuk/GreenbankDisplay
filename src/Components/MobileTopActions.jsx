// src/Components/MobileTopActions.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import QuranViewer from "./quran/QuranViewer";

/**
 * Backwards compatible:
 * - slideshowUrl, zIndex, className work exactly as before
 *
 * Optional:
 * - show: { messages?:bool, adhkar?:bool, quran?:bool, more?:bool }
 */
export default function MobileTopActions({
  slideshowUrl = "/slideshow",
  zIndex = 80,
  className = "",
  show,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [toast, setToast]     = useState("");

  // Messages iframe safety
  const [msgLoaded,   setMsgLoaded]   = useState(false);
  const [msgTimedOut, setMsgTimedOut] = useState(false);
  const [msgAttempt,  setMsgAttempt]  = useState(0);
  const msgTimeoutRef = useRef(null);

  const actions = useMemo(() => {
    const base = [
      { key: "messages", label: "Messages", Icon: IconChat    },
      { key: "adhkar",   label: "Adhkar",   Icon: IconTasbih  },
      { key: "quran",    label: "Qur'an",   Icon: IconBook    },
      { key: "more",     label: "More",     Icon: IconMore    },
    ];
    if (!show) return base;
    return base.filter((a) => show[a.key] !== false);
  }, [show]);

  // Prevent background scroll while overlay is open
  useEffect(() => {
    if (!openKey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [openKey]);

  // Toast helper
  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(""), 1800);
  };

  const title = useMemo(
    () => actions.find((x) => x.key === openKey)?.label ?? "",
    [openKey, actions]
  );

  // Reset / setup Messages load watchdog when opening Messages
  useEffect(() => {
    if (openKey !== "messages") {
      setMsgLoaded(false);
      setMsgTimedOut(false);
      if (msgTimeoutRef.current) { clearTimeout(msgTimeoutRef.current); msgTimeoutRef.current = null; }
      return;
    }
    setMsgLoaded(false);
    setMsgTimedOut(false);
    if (msgTimeoutRef.current) clearTimeout(msgTimeoutRef.current);
    msgTimeoutRef.current = setTimeout(() => setMsgTimedOut(true), 4500);
    return () => {
      if (msgTimeoutRef.current) { clearTimeout(msgTimeoutRef.current); msgTimeoutRef.current = null; }
    };
  }, [openKey, msgAttempt]);

  const close = () => setOpenKey(null);

  const retryMessages = () => {
    setMsgLoaded(false);
    setMsgTimedOut(false);
    setMsgAttempt((n) => n + 1);
    flash("Retrying…");
  };

  const isQuran = openKey === "quran";

  return (
    <>
      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className={["px-4 pb-3", className].join(" ")}>
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg px-2 py-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
          >
            {actions.map((a) => {
              const active = openKey === a.key;
              const AIcon  = a.Icon;
              return (
                <button
                  key={a.key}
                  onClick={() => setOpenKey(active ? null : a.key)}
                  className={[
                    "rounded-xl px-2 py-2 text-[12px] font-semibold",
                    "border border-white/10",
                    "transition active:scale-[0.99]",
                    "flex flex-col items-center justify-center gap-1",
                    active ? "bg-white/20" : "bg-black/20 hover:bg-black/25",
                  ].join(" ")}
                >
                  <AIcon className="opacity-95" />
                  <span className="leading-none">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Full-screen overlay ─────────────────────────────────────────── */}
      {openKey && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 flex flex-col">

            {/* Overlay header — always shown */}
            <div className="shrink-0 px-4 pt-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg">
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="text-base font-bold truncate">{title}</div>
                  <button
                    onClick={close}
                    className="rounded-xl border border-white/15 bg-black/25 px-3 py-1.5 text-sm font-semibold hover:bg-black/35"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Overlay body
                ┌─────────────────────────────────────────────┐
                │ Quran: no extra padding, QuranViewer owns    │
                │ every pixel below the header.               │
                │ Others: padded card layout (unchanged).      │
                └─────────────────────────────────────────────┘ */}
            {isQuran ? (
              // h-full + flex-1 + min-h-0 = QuranViewer fills every remaining pixel
              <div className="flex-1 min-h-0 h-full overflow-hidden flex flex-col">
                <QuranViewer />
              </div>
            ) : (
              <div className="flex-1 min-h-0 px-4 pb-4 pt-3 overflow-hidden">
                <div className="h-full rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md shadow-lg overflow-hidden">

                  {/* Messages */}
                  {openKey === "messages" && (
                    <div className="p-4">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 mb-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/25 border border-white/10">
                            <IconChat />
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold leading-tight">Messages</div>
                            <div className="text-sm opacity-80 leading-snug">
                              If the slideshow doesn't load, it will be improved soon. You can retry below.
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={retryMessages}
                            className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                          >
                            Retry
                          </button>
                          <a
                            href={slideshowUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                          >
                            Open in browser
                          </a>
                        </div>
                      </div>

                      {!msgLoaded && !msgTimedOut && (
                        <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-4 mb-3">
                          <div className="flex items-center gap-3">
                            <Spinner />
                            <div className="text-sm opacity-85">Loading slideshow…</div>
                          </div>
                        </div>
                      )}

                      {msgTimedOut && !msgLoaded && (
                        <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-4 mb-3">
                          <div className="text-sm">
                            <div className="font-semibold mb-1">Still loading…</div>
                            <div className="opacity-85">
                              This may be due to a slow connection or the browser blocking embedded content.
                              This will be improved soon.
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-white/15 bg-black/25 overflow-hidden">
                        <div className="h-[calc(100vh-260px)]">
                          <iframe
                            key={msgAttempt}
                            title="Messages Slideshow"
                            src={slideshowUrl}
                            className="w-full h-full"
                            style={{ border: 0 }}
                            allow="autoplay; fullscreen"
                            onLoad={() => setMsgLoaded(true)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Adhkar placeholder */}
                  {openKey === "adhkar" && (
                    <ComingSoon
                      icon={<IconTasbih className="opacity-90" />}
                      title="Adhkar"
                      body="This feature will be updated soon (Google Sheet-driven adhkar rotator)."
                    />
                  )}

                  {/* More panel */}
                  {openKey === "more" && (
                    <ComingSoon
                      icon={<IconMore className="opacity-90" />}
                      title="More"
                      body="More shortcuts will be added soon."
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div
              className="pointer-events-none fixed left-0 right-0 bottom-5 flex justify-center"
              style={{ zIndex: zIndex + 1 }}
            >
              <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/15 text-sm">
                {toast}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ComingSoon({ icon, title, body }) {
  return (
    <div className="p-4">
      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 border border-white/10">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight">{title}</div>
            <div className="mt-1 text-sm opacity-85 leading-snug">{body}</div>
            <div className="mt-3 text-xs opacity-70">
              Tip: This is a placeholder to avoid blank screens. It will be upgraded soon.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white/90 animate-spin"
      aria-hidden="true"
    />
  );
}

/* ── Icons (inline SVG, no deps) ─────────────────────────────────────────── */

function IconBase({ children, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function IconChat({ className = "" }) {
  return (
    <IconBase className={className}>
      <path
        d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-2 2Z"
        stroke="currentColor" strokeWidth="1.6"
      />
    </IconBase>
  );
}

function IconTasbih({ className = "" }) {
  return (
    <IconBase className={className}>
      <path
        d="M12 3c2.2 0 4 1.8 4 4 0 1.1-.4 2-1.1 2.8l1.3 1.3c.6.6.6 1.6 0 2.2l-.7.7c-.6.6-1.6.6-2.2 0l-1.3-1.3c-.8.7-1.7 1.1-2.8 1.1-2.2 0-4-1.8-4-4s1.8-4 4-4Z"
        stroke="currentColor" strokeWidth="1.6"
      />
      <path d="M8.5 15.5l-1.7 1.7a3 3 0 1 0 4.2 4.2l1.7-1.7" stroke="currentColor" strokeWidth="1.6" />
    </IconBase>
  );
}

function IconBook({ className = "" }) {
  return (
    <IconBase className={className}>
      <path
        d="M6 4.5h10a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6.5a2 2 0 0 1 2-2Z"
        stroke="currentColor" strokeWidth="1.6"
      />
      <path d="M8 7h8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10h8" stroke="currentColor" strokeWidth="1.6" />
    </IconBase>
  );
}

function IconMore({ className = "" }) {
  return (
    <IconBase className={className}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </IconBase>
  );
}