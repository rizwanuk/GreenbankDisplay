// src/Components/MobileTopActions.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import QuranViewer from "./quran/QuranViewer";
import AdhkarTracker from "./adhkar/AdhkarTracker";


export default function MobileTopActions({
  slideshowUrl = "/slideshow",
  zIndex = 80,
  className = "",
  show,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [toast, setToast]     = useState("");

  // Messages iframe
  const [msgLoaded,   setMsgLoaded]   = useState(false);
  const [msgTimedOut, setMsgTimedOut] = useState(false);
  const [msgAttempt,  setMsgAttempt]  = useState(0);
  const msgTimeoutRef = useRef(null);

  // Measure the overlay header so we can give the body exact remaining height
  const headerRef      = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    if (!openKey || !headerRef.current) return;
    const measure = () => {
      if (headerRef.current)
        setHeaderH(headerRef.current.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [openKey]);

  const actions = useMemo(() => {
    const base = [
      { key: "messages", label: "Messages", Icon: IconChat   },
      { key: "adhkar",   label: "Adhkar",   Icon: IconTasbih },
      { key: "quran",    label: "Qur'an",   Icon: IconBook   },
      { key: "more",     label: "More",     Icon: IconMore   },
    ];
    if (!show) return base;
    return base.filter((a) => show[a.key] !== false);
  }, [show]);

  useEffect(() => {
    if (!openKey) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [openKey]);

  const flash = (msg) => {
    setToast(msg);
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => setToast(""), 1800);
  };

  const title = useMemo(
    () => actions.find((x) => x.key === openKey)?.label ?? "",
    [openKey, actions]
  );

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
          {/* ── Header (measured) ───────────────────────────────────────── */}
          <div ref={headerRef} className="px-4 pt-4 pb-2">
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

          {/* ── Body — explicitly sized to remaining viewport height ─────── */}
          {/* Using calc(100vh - headerH) removes all flex guesswork         */}
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
            {isQuran ? (
              <div style={{ width: "100%", height: "100%" }}>
                <QuranViewer />
              </div>
            ) : openKey === "adhkar" ? (
              <div style={{ width: "100%", height: "100%" }}>
                <AdhkarTracker />
              </div>
            ) : (
              <div className="h-full px-4 pb-4 pt-1 overflow-hidden">
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
                              If the slideshow doesn't load, you can retry below.
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={retryMessages} className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold">
                            Retry
                          </button>
                          <a href={slideshowUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-white/15 bg-black/25 hover:bg-black/35 text-sm font-semibold">
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
                            <div className="opacity-85">May be a slow connection or browser blocking embedded content.</div>
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

                  {openKey === "more" && (
                    <ComingSoon icon={<IconMore className="opacity-90" />} title="More" body="More shortcuts will be added soon." />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div className="pointer-events-none fixed left-0 right-0 bottom-5 flex justify-center" style={{ zIndex: zIndex + 1 }}>
              <div className="px-4 py-2 rounded-xl bg-black/70 border border-white/15 text-sm">{toast}</div>
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
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 border border-white/10">{icon}</span>
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight">{title}</div>
            <div className="mt-1 text-sm opacity-85 leading-snug">{body}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white/90 animate-spin" aria-hidden="true" />;
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