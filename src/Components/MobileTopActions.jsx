// src/Components/MobileTopActions.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import QuranViewer from "./quran/QuranViewer";
import AdhkarTracker from "./adhkar/AdhkarTracker";

const SELF_CONTAINED = new Set(["adhkar", "quran"]);

/* helpers */

function parseSlides(settingsMap) {
  const now = moment();
  return Object.entries(settingsMap || {})
    .filter(([key]) => /^slideshow\.slide\d+$/.test(key))
    .map(([key, value]) => {
      try {
        const slide = JSON.parse(value);
        const num = parseInt(key.replace("slideshow.slide", ""), 10);
        return { ...slide, _key: key, _num: num };
      } catch {
        return null;
      }
    })
    .filter(
      (s) =>
        s &&
        moment(s.start).isBefore(now) &&
        moment(s.end).isAfter(now)
    )
    .sort((a, b) => a._num - b._num);
}

function slideTitle(slide, index) {
  if (slide.title && slide.title.trim()) return slide.title.trim();
  if (slide.type === "text" && slide.content) {
    const words = slide.content.trim().split(/\s+/).slice(0, 8).join(" ");
    return words.length < slide.content.trim().length ? words + "..." : words;
  }
  if (slide.type === "image") return `Message ${index + 1}`;
  if (slide.type === "html") return `Message ${index + 1}`;
  if (slide.type === "embed") return `Message ${index + 1}`;
  return `Message ${index + 1}`;
}

function TypeBadge({ type }) {
  const colours = {
    text: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    image: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    html: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    embed: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide",
        colours[type] || "bg-white/10 text-white/60 border-white/10",
      ].join(" ")}
    >
      {type}
    </span>
  );
}

/* Slide viewer - full screen */

function SlideViewer({ slide, onClose }) {
  const htmlRef = useRef(null);

  useEffect(() => {
    if (slide?.type !== "html" || !htmlRef.current) return;
    const scripts = Array.from(htmlRef.current.querySelectorAll("script"));
    scripts.forEach((old) => {
      const s = document.createElement("script");
      Array.from(old.attributes).forEach((a) => s.setAttribute(a.name, a.value));
      if (old.textContent?.trim()) s.text = old.textContent;
      old.parentNode?.replaceChild(s, old);
    });
  }, [slide]);

  if (!slide) return null;

  return (
    <div className="absolute inset-0 bg-black flex flex-col overflow-hidden">
      <div
        className="shrink-0 px-4 pb-2 z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="text-base font-bold truncate pr-2">{slide._title}</div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-black/25 px-3 py-1.5 text-sm font-semibold hover:bg-black/35 shrink-0"
            >
              Back
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-4 pb-4 pt-1">
        <div className="h-full rounded-2xl border border-white/15 bg-black overflow-hidden flex items-center justify-center">
          {slide.type === "image" && (
            <img
              src={slide.content}
              alt=""
              className="object-contain w-full h-full max-w-full max-h-full"
            />
          )}
          {slide.type === "text" && (
            <div className="text-white text-2xl font-bold px-6 text-center leading-relaxed">
              {slide.content}
            </div>
          )}
          {slide.type === "html" && slide.content && (
            <div
              ref={htmlRef}
              className="w-full h-full overflow-auto"
              dangerouslySetInnerHTML={{ __html: slide.content }}
            />
          )}
          {slide.type === "embed" && (slide.embedHtml || slide.content) && (
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{
                __html:
                  slide.embedHtml ||
                  `<iframe src="${slide.content}" style="width:100%;height:100%;border:0;" allowfullscreen></iframe>`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* Slide type icon */

function SlideIcon({ type }) {
  if (type === "image")
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  if (type === "html" || type === "embed")
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
        <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* Messages list */

function MessagesPanel({ settingsMap }) {
  const [openSlide, setOpenSlide] = useState(null);

  const slides = useMemo(() => {
    const raw = parseSlides(settingsMap);
    return raw.map((s, i) => ({ ...s, _title: slideTitle(s, i) }));
  }, [settingsMap]);

  if (openSlide) {
    return <SlideViewer slide={openSlide} onClose={() => setOpenSlide(null)} />;
  }

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="px-4 pb-4 pt-1 space-y-2">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" className="mb-3 opacity-50">
              <path d="M7 18l-3 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-2 2Z" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <div className="text-base font-semibold">No messages</div>
            <div className="text-sm mt-1 opacity-75">There are no active messages right now.</div>
          </div>
        ) : (
          slides.map((slide) => (
            <button
              key={slide._key}
              onClick={() => setOpenSlide(slide)}
              className="w-full text-left rounded-2xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.10] active:scale-[0.99] transition px-4 py-3 flex items-start gap-3"
            >
              <span className="shrink-0 mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/30 border border-white/10">
                <SlideIcon type={slide.type} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold leading-snug truncate">
                    {slide._title}
                  </span>
                  <TypeBadge type={slide.type} />
                </div>
                <div className="text-[11px] opacity-55 mt-0.5">
                  Until {moment(slide.end).format("D MMM YYYY")}
                </div>
              </div>
              <span className="shrink-0 self-center opacity-40">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* Main export */

export default function MobileTopActions({
  slideshowUrl = "/messages",
  zIndex = 80,
  className = "",
  show,
  settingsMap = {},
}) {
  const [openKey, setOpenKey] = useState(null);
  const [toast, setToast] = useState("");

  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    if (!openKey || SELF_CONTAINED.has(openKey) || openKey === "messages" || !headerRef.current) return;
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
    return () => { document.body.style.overflow = prev; };
  }, [openKey]);

  const title = useMemo(
    () => actions.find((x) => x.key === openKey)?.label ?? "",
    [openKey, actions]
  );

  const close = () => setOpenKey(null);
  const isSelfContained = SELF_CONTAINED.has(openKey);

  return (
    <>
      <div className={["px-4 pb-3", className].join(" ")}>
        <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg px-2 py-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
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

      {openKey && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
        >
          {isSelfContained ? (
            <div className="absolute inset-0 overflow-hidden">
              {openKey === "adhkar" && <AdhkarTracker />}
              {openKey === "quran" && <QuranViewer onClose={close} />}
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

          ) : openKey === "messages" ? (
            <div className="absolute inset-0 flex flex-col overflow-hidden">
              <div
                className="shrink-0 px-4 pb-2"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
              >
                <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg">
                  <div className="flex items-center justify-between px-3 py-3">
                    <div className="text-base font-bold">Messages</div>
                    <button
                      onClick={close}
                      className="rounded-xl border border-white/15 bg-black/25 px-3 py-1.5 text-sm font-semibold hover:bg-black/35"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 relative overflow-hidden">
                <MessagesPanel settingsMap={settingsMap} />
              </div>
            </div>

          ) : (
            <>
              <div
                ref={headerRef}
                className="px-4 pb-2"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
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
                style={{ position: "absolute", top: headerH || 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
              >
                <div className="h-full px-4 pb-4 pt-1 overflow-hidden">
                  <div className="h-full rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md shadow-lg overflow-hidden">
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