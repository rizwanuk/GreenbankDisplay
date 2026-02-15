// src/Components/quran/PdfJsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfJsPage({
  url,
  pageNumber,
  zoom = 1.2,
  fitWidth = true,
  containerWidthPx,
  onNumPages,
  onError,
  onRendered,
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [doc, setDoc] = useState(null);

  // ✅ Store callbacks in refs so they don't trigger reloads
  const onNumPagesRef = useRef(onNumPages);
  const onErrorRef = useRef(onError);
  const onRenderedRef = useRef(onRendered);

  useEffect(() => {
    onNumPagesRef.current = onNumPages;
  }, [onNumPages]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  // ✅ Load document ONLY when URL changes
  useEffect(() => {
    let alive = true;
    setDoc(null);

    const loadingTask = pdfjsLib.getDocument({
      url,
      withCredentials: false,
      disableAutoFetch: false,
      disableStream: false,
    });

    loadingTask.promise
      .then((loaded) => {
        if (!alive) return;
        setDoc(loaded);
        onNumPagesRef.current?.(loaded.numPages);
      })
      .catch((e) => {
        if (!alive) return;
        onErrorRef.current?.(e?.message || "Failed to load PDF.");
      });

    return () => {
      alive = false;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [url]);

  const effectiveZoom = useMemo(() => {
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1.2;
  }, [zoom]);

  // Render page whenever doc/page/zoom/width changes
  useEffect(() => {
    if (!doc) return;
    if (!canvasRef.current) return;

    const clampedPage = Math.min(Math.max(1, pageNumber || 1), doc.numPages);

    let cancelled = false;

    async function render() {
      try {
        // Cancel any in-flight render
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await doc.getPage(clampedPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });

        // Fit-to-width scaling
        let scale = effectiveZoom;

        // extra safety padding to prevent 1–2px overflow causing scrollbars
        const safePad = 16;

        if (fitWidth && containerWidthPx && containerWidthPx > 50) {
          const target = Math.max(50, containerWidthPx - safePad);
          scale = (target / baseViewport.width) * effectiveZoom;
        }
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });

        const dpr = window.devicePixelRatio || 1;

        // Internal buffer size (sharp)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // Visual size (prevent horizontal overflow)
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.display = "block";

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // ✅ Paint a white background (removes “dark behind” feel + reduces flicker)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply DPR transform
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled) return;
        onRenderedRef.current?.();
      } catch (e) {
        if (cancelled) return;
        if (String(e?.name || "").toLowerCase().includes("cancel")) return;
        onErrorRef.current?.(e?.message || "Failed to render page.");
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [doc, pageNumber, effectiveZoom, fitWidth, containerWidthPx]);

  return (
    <div className="w-full flex justify-center overflow-x-hidden">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}
