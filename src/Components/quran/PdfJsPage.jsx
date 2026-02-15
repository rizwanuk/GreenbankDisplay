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
  onLoading, // optional
}) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ Keep callbacks in refs so they don't retrigger effects
  const onNumPagesRef = useRef(onNumPages);
  const onErrorRef = useRef(onError);
  const onRenderedRef = useRef(onRendered);
  const onLoadingRef = useRef(onLoading);

  useEffect(() => {
    onNumPagesRef.current = onNumPages;
  }, [onNumPages]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onRenderedRef.current = onRendered;
  }, [onRendered]);

  useEffect(() => {
    onLoadingRef.current = onLoading;
  }, [onLoading]);

  // ✅ Bucket width so tiny 1–2px changes don't cause constant rerenders
  const widthBucket = useMemo(() => {
    const w = Number(containerWidthPx) || 0;
    if (w <= 0) return 0;
    // bucket to 8px increments
    return Math.max(0, Math.round(w / 8) * 8);
  }, [containerWidthPx]);

  const effectiveZoom = useMemo(() => {
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1.2;
  }, [zoom]);

  // ✅ Load document only when URL changes (don’t blank doc immediately)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    onLoadingRef.current?.(true);

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
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        onLoadingRef.current?.(false);
      });

    return () => {
      alive = false;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [url]);

  // ✅ Prevent redundant renders
  const lastRenderKeyRef = useRef("");

  // ✅ Render page whenever doc/page/zoom/widthBucket changes
  useEffect(() => {
    if (!doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const clampedPage = Math.min(Math.max(1, pageNumber || 1), doc.numPages);

    // if we don’t yet have a reasonable width, still render using zoom only
    const safeWidth = widthBucket > 50 ? widthBucket : 0;

    const renderKey = `${url}|p:${clampedPage}|z:${effectiveZoom.toFixed(3)}|w:${safeWidth}|fit:${fitWidth ? 1 : 0}`;
    if (lastRenderKeyRef.current === renderKey) return;
    lastRenderKeyRef.current = renderKey;

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

        // More generous pad to avoid micro overflow
        const safePad = 20;

        if (fitWidth && safeWidth) {
          const target = Math.max(50, safeWidth - safePad);
          scale = (target / baseViewport.width) * effectiveZoom;
        }

        const viewport = page.getViewport({ scale });

        const ctx = canvas.getContext("2d", { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        // Internal buffer size (sharp)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        // Visual size: fixed pixel width, but never exceed container
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.style.maxWidth = "100%";
        canvas.style.display = "block";

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Paint white background (prevents “dark behind” flicker)
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
  }, [doc, pageNumber, effectiveZoom, fitWidth, widthBucket, url]);

  return (
    <div className="w-full flex justify-center overflow-x-hidden">
      <canvas ref={canvasRef} className="rounded-xl" />
      {/* If you ever want a subtle loader, we can add it here.
          Keeping it empty for now to avoid layout changes. */}
    </div>
  );
}
