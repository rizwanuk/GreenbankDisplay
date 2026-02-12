import React, { useEffect, useRef, useState } from "react";
import moment from "moment";

export default function SlideshowPanel({ settingsMap }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentTime, setCurrentTime] = useState(moment());

  // ✅ Used to execute scripts inside HTML slides
  const htmlSlideRef = useRef(null);

  // Best-effort cleanup for timers created by slide scripts
  const slideIntervalIdsRef = useRef([]);
  const slideTimeoutIdsRef = useRef([]);

  const duration = parseInt(settingsMap["slideshow.duration"]) || 10;

  // ⏲ Keep current time fresh every second
  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ⛳ Get valid slides based on current time
  const slides = Object.entries(settingsMap)
    .filter(([key]) => /^slideshow\.slide\d+$/.test(key))
    .map(([key, value]) => {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.warn("Invalid slide JSON for", key, e);
        return null;
      }
    })
    .filter(
      (slide) =>
        slide &&
        moment(slide.start).isBefore(currentTime) &&
        moment(slide.end).isAfter(currentTime)
    );

  const currentSlide = slides[currentSlideIndex] || null;

  // Keep index in range if slide list changes
  useEffect(() => {
    if (slides.length === 0) {
      if (currentSlideIndex !== 0) setCurrentSlideIndex(0);
      return;
    }
    if (currentSlideIndex >= slides.length) setCurrentSlideIndex(0);
  }, [slides.length, currentSlideIndex]);

  // ⏱ Slide rotation with countdown
  useEffect(() => {
    if (slides.length === 0) return;

    setTimeLeft(duration);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slides.length);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [slides.length, duration]);

  // ✅ Execute <script> tags inside the injected HTML for html slides
  useEffect(() => {
    // Clear timers created by previous slide scripts
    slideIntervalIdsRef.current.forEach((id) => {
      try {
        clearInterval(id);
      } catch (_) {}
    });
    slideTimeoutIdsRef.current.forEach((id) => {
      try {
        clearTimeout(id);
      } catch (_) {}
    });
    slideIntervalIdsRef.current = [];
    slideTimeoutIdsRef.current = [];

    if (!currentSlide) return;
    if (currentSlide.type !== "html") return;

    const root = htmlSlideRef.current;
    if (!root) return;

    const scripts = Array.from(root.querySelectorAll("script"));
    if (scripts.length === 0) return;

    // Track timers created during script execution (best-effort cleanup)
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;

    window.setInterval = function (...args) {
      const id = originalSetInterval.apply(window, args);
      slideIntervalIdsRef.current.push(id);
      return id;
    };

    window.setTimeout = function (...args) {
      const id = originalSetTimeout.apply(window, args);
      slideTimeoutIdsRef.current.push(id);
      return id;
    };

    try {
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");

        // Copy attributes (src, type, async, defer, etc.)
        Array.from(oldScript.attributes || []).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Copy inline JS (if any)
        const inlineCode = oldScript.text || oldScript.textContent;
        if (inlineCode && inlineCode.trim()) {
          newScript.text = inlineCode;
        }

        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    } finally {
      window.setInterval = originalSetInterval;
      window.setTimeout = originalSetTimeout;
    }
  }, [currentSlideIndex, currentSlide?.type, currentSlide?.content]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative bg-black">
      {!currentSlide ? (
        <div className="text-white text-center text-3xl">No active slides</div>
      ) : (
        <div className="w-full h-full flex items-center justify-center relative">
          {currentSlide.type === "image" && (
            <img
              src={currentSlide.content}
              alt=""
              className="object-contain w-auto h-full max-h-full max-w-full rounded-xl shadow-2xl"
            />
          )}

          {currentSlide.type === "text" && (
            <div className="text-white text-5xl font-bold px-8 text-center leading-relaxed max-w-6xl">
              {currentSlide.content}
            </div>
          )}

          {currentSlide.type === "embed" &&
            (currentSlide.embedHtml || currentSlide.content) && (
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{
                    __html:
                      currentSlide.embedHtml ||
                      `<iframe src="${currentSlide.content}" style="width:100vw;height:100vh;border:0;margin:0;padding:0;" frameborder="0" allowfullscreen></iframe>`,
                  }}
                />
              </div>
            )}

          {/* ✅ HTML CTA SLIDE (scripts will execute via the effect above) */}
          {currentSlide.type === "html" && currentSlide.content && (
            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <div
                ref={htmlSlideRef}
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: currentSlide.content,
                }}
              />
            </div>
          )}

          {/* ⏳ Countdown */}
          <div className="absolute bottom-4 right-4 text-sm text-white bg-black/60 px-3 py-1 rounded-md">
            Next slide in {timeLeft}s
          </div>
        </div>
      )}
    </div>
  );
}
