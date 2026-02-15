// src/Components/quran/PdfJsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfJsPage({
  url,
  pageNumber,
  zoom = 1.0,
  fitWidth = true,
  containerWidthPx,
  onNumPages,
  onError,
  onRendered,
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [doc, setDoc] = useState(null);

  // keep callbacks stable (avoid reload loops)
  const onNumPagesRef = useRef(onNumPages);
  const onErrorRef = useRef(onError);
  const onRenderedRef = useRef(onRendered);

  useEffect(() => void (onNumPagesRef.current = onNumPages), [onNumPages]);
  useEffect(() => void (onErrorRef.current = onError), [onError]);
  useEffect(() => void (onRenderedRef.current = onRendered), [onRendered]);

  // Load document when URL changes
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
    const z = Number(zoom);
    return Number.isFinite(z) && z > 0 ? z : 1.0;
  }, [zoom]);

  // Render page whenever doc/page/zoom/width changes
  useEffect(() => {
    if (!doc || !canvasRef.current) return;

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
        const safeGutter = 12; // avoid 1–2px overflow on iOS
        let scale = effectiveZoom;

        if (fitWidth && containerWidthPx && containerWidthPx > 80) {
          const target = Math.max(80, containerWidthPx - safeGutter);
          scale = (target / baseViewport.width) * effectiveZoom;
        }

        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        // internal buffer (sharp)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // ✅ visually fill width (no centering container)
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // reset and paint white
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // DPR transform
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

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
    <div className="w-full overflow-x-hidden">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}
