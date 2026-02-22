// src/Components/MobileTopActions.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import QuranViewer from "./quran/QuranViewer";
import AdhkarTracker from "./adhkar/AdhkarTracker";

// These panels manage their own UI fully — no shared header needed
const SELF_CONTAINED = new Set(["adhkar", "quran"]);

export default function MobileTopActions({
  slideshowUrl = "/messages",
  zIndex = 80,
  className = "",
  show,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [toast, setToast] = useState("");

  // Measure the shared header height (only used for messages / more)
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  // Messages iframe safety (embed can fail on some mobile browsers)
  const [msgLoaded, setMsgLoaded] = useState(false);
  const [msgTimedOut, setMsgTimedOut] = useState(false);
  const [msgAttempt, setMsgAttempt] = useState(0);
  const msgTimeoutRef = useRef(null);

  useEffect(() => {
    if (!openKey || SELF_CONTAINED.has(openKey) || !headerRef.current) return;
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [openKey]);

  const actions = useMemo(() => {
    const base = [
      { key: "messages", label: "Messages", Icon: IconChat },
      { key: "adhkar", label: "Adhkar", Icon: IconTasbih },
      { key: "quran", label: "Qur'an", Icon: IconBook },
      { key: "more", label: "More", Icon: IconMore },
    ];
    if (!show) return base;
    return base.filter((a) => show[a.key] !== false);
  }, [show]);

  useEffect(() => {
    if (!openKey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openKey]);

  // Reset messages iframe states whenever Messages is opened (or retried)
  useEffect(() => {
    if (openKey !== "messages") return;

    setMsgLoaded(false);
    setMsgTimedOut(false);

    if (msgTimeoutRef.current) window.clearTimeout(msgTimeoutRef.current);
    msgTimeoutRef.current = window.setTimeout(() => {
      setMsgTimedOut(true);
    }, 8000);

    return () => {
      if (msgTimeoutRef.current) window.clearTimeout(msgTimeoutRef.current);
    };
  }, [openKey, msgAttempt]);

  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(""), 1800);
  };

  const title = useMemo(
    () => actions.find((x) => x.key === openKey)?.label ?? "",
    [openKey, actions]
  );

  const close = () => setOpenKey(null);

  const isSelfContained = SELF_CONTAINED.has(openKey);

  // If later you add a true “slides-only” mode, keep this param.
  // For now it will just be ignored by the slideshow screen (safe).
  const messagesSrc = `${slideshowUrl}?embed=1&slides=1&try=${msgAttempt}`;

  return (
    <>
      {/* ── Action bar (NO extra safe-area padding here) ────────────────── */}
      <div className={["px-4 pb-3", className].join(" ")}>
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg px-2 py-2">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))`,
            }}
          >
            {actions.map((a) => {
              const active = openKey === a.key;
              const AIcon = a.Icon;
              return (
                <button
                  key={a.key}
                  onClick={() => setOpenKey(active ? null : a.key)}
                  className={[
                    "rounded-xl px-2 py-2 text-[12px] font-semibold",
                    "border border-white/10 transition active:scale-[0.99]",
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
          {/* ── Self-contained panels (Adhkar, Quran) ───────────────────── */}
          {isSelfContained ? (
            <div className="absolute inset-0 overflow-hidden">
              {openKey === "adhkar" && <AdhkarTracker />}

              {/* Qur'an: Close is INSIDE QuranViewer toolbar now */}
              {openKey === "quran" && <QuranViewer onClose={close} />}

              {/* Only show floating Close for Adhkar (Quran has its own now) */}
              {openKey === "adhkar" && (
                <button
                  onClick={close}
                  style={{
                    position: "absolute",
                    right: 16,
                    bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
                    zIndex: 50,
                  }}
                  className="px-4 py-2 rounded-2xl border border-white/20 bg-black/60 backdrop-blur-sm text-sm font-semibold text-white hover:bg-black/70 transition active:scale-95"
                >
                  Close
                </button>
              )}
            </div>
          ) : (
            /* ── Shared-header panels (Messages, More) ─────────────────── */
            <>
              <div
                ref={headerRef}
                className="px-4 pb-2"
                style={{
                  paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
                }}
              >
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

              <div
                style={{
                  position: "absolute",
                  top: headerH || 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflow: "hidden",
                }}
              >
                <div className="h-full px-4 pb-4 pt-1 overflow-hidden">
                  <div className="h-full rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md shadow-lg overflow-hidden">
                    {/* Messages: embed slideshow */}
                    {openKey === "messages" && (
                      <div className="h-full flex flex-col">
                        {/* Top controls */}
                        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                          <button
                            onClick={() => setMsgAttempt((n) => n + 1)}
                            className="px-3 py-1.5 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                          >
                            Reload embed
                          </button>

                          <a
                            href={slideshowUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                            onClick={() => flash("Opening slideshow…")}
                          >
                            Open slideshow (direct)
                          </a>

                          <div className="ml-auto text-xs opacity-70">
                            {msgLoaded ? "Loaded" : msgTimedOut ? "Embed blocked" : "Loading…"}
                          </div>
                        </div>

                        {/* Embed area */}
                        <div className="relative flex-1">
                          {!msgLoaded && !msgTimedOut && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="px-4 py-3 rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold">
                                Loading slideshow…
                              </div>
                            </div>
                          )}

                          {msgTimedOut && !msgLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                              <div className="max-w-md w-full rounded-2xl border border-white/15 bg-white/10 p-4 text-center">
                                <div className="text-lg font-bold">Embed blocked</div>
                                <div className="mt-1 text-sm opacity-85">
                                  Your browser didn’t allow the slideshow to load inside the app.
                                </div>
                                <div className="mt-3 flex gap-2 justify-center">
                                  <button
                                    onClick={() => setMsgAttempt((n) => n + 1)}
                                    className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                                  >
                                    Try again
                                  </button>
                                  <a
                                    href={slideshowUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold"
                                  >
                                    Open slideshow (direct)
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          <iframe
                            key={msgAttempt}
                            title="Greenbank Slideshow"
                            src={messagesSrc}
                            className="absolute inset-0 w-full h-full"
                            style={{ border: 0 }}
                            loading="eager"
                            referrerPolicy="no-referrer"
                            allow="autoplay; fullscreen; clipboard-read; clipboard-write"
                            allowFullScreen
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                            onLoad={() => {
                              setMsgLoaded(true);
                              setMsgTimedOut(false);
                              if (msgTimeoutRef.current) window.clearTimeout(msgTimeoutRef.current);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {openKey === "more" && (
                      <ComingSoon
                        icon={<IconMore className="opacity-90" />}
                        title="More"
                        body="More shortcuts will be added soon."
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

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
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <path d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-2 2Z" stroke="currentColor" strokeWidth="1.6" />
    </IconBase>
  );
}

function IconTasbih({ className = "" }) {
  return (
    <IconBase className={className}>
      <path d="M12 3c2.2 0 4 1.8 4 4 0 1.1-.4 2-1.1 2.8l1.3 1.3c.6.6.6 1.6 0 2.2l-.7.7c-.6.6-1.6.6-2.2 0l-1.3-1.3c-.8.7-1.7 1.1-2.8 1.1-2.2 0-4-1.8-4-4s1.8-4 4-4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 15.5l-1.7 1.7a3 3 0 1 0 4.2 4.2l1.7-1.7" stroke="currentColor" strokeWidth="1.6" />
    </IconBase>
  );
}

function IconBook({ className = "" }) {
  return (
    <IconBase className={className}>
      <path d="M6 4.5h10a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V6.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
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