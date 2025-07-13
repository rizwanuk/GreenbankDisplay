import React, { useEffect, useState } from "react";
import moment from "moment";

export default function SlideshowPanel({ settingsMap }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentTime, setCurrentTime] = useState(moment());

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

  if (!currentSlide) {
    return <div className="text-white text-center text-3xl">No active slides</div>;
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative bg-black">
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

        {currentSlide.type === "embed" && (currentSlide.embedHtml || currentSlide.content) && (
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

        {/* ⏳ Countdown */}
        <div className="absolute bottom-4 right-4 text-sm text-white bg-black/60 px-3 py-1 rounded-md">
          Next slide in {timeLeft}s
        </div>
      </div>
    </div>
  );
}
