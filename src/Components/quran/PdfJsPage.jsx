// src/Components/quran/PdfJsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfJsPage({
  url,
  pageNumber,
  zoom = 1.0,
  onNumPages,
  onError,
  onRendered,
}) {
  const wrapperRef     = useRef(null);
  const canvasRef      = useRef(null);
  const renderTaskRef  = useRef(null);
  const [doc, setDoc]  = useState(null);

  // Measure the wrapper's actual pixel width — this is the ground truth
  const [wrapperWidth, setWrapperWidth] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setWrapperWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep callbacks stable
  const onNumPagesRef = useRef(onNumPages);
  const onErrorRef    = useRef(onError);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => void (onNumPagesRef.current = onNumPages), [onNumPages]);
  useEffect(() => void (onErrorRef.current    = onError),    [onError]);
  useEffect(() => void (onRenderedRef.current = onRendered), [onRendered]);

  // ── Load document ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setDoc(null);

    const task = pdfjsLib.getDocument({ url, withCredentials: false });
    task.promise
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
      try { task.destroy(); } catch {}
    };
  }, [url]);

  const effectiveZoom = useMemo(() => {
    const z = Number(zoom);
    return Number.isFinite(z) && z > 0 ? z : 1.0;
  }, [zoom]);

  // ── Render page ──────────────────────────────────────────────────────────
  // Re-runs whenever doc, page, zoom, OR the measured wrapper width changes
  useEffect(() => {
    if (!doc || !canvasRef.current || wrapperWidth < 10) return;

    const clampedPage = Math.min(Math.max(1, pageNumber || 1), doc.numPages);
    let cancelled = false;

    async function render() {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }

      try {
        const page         = await doc.getPage(clampedPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const dpr          = window.devicePixelRatio || 1;

        // Scale so the page fills the wrapper exactly, then apply zoom
        const fitScale = wrapperWidth / baseViewport.width;
        const scale    = fitScale * effectiveZoom;

        const viewport = page.getViewport({ scale });
        const canvas   = canvasRef.current;
        const ctx      = canvas.getContext("2d", { alpha: false });

        // Physical pixel buffer (sharp on retina / high-DPI)
        canvas.width  = Math.round(viewport.width  * dpr);
        canvas.height = Math.round(viewport.height * dpr);

        // CSS display size — fill wrapper width, proportional height
        canvas.style.display = "block";
        canvas.style.width   = `${wrapperWidth}px`;
        canvas.style.height  = `${Math.round(viewport.height)}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled  = true;
        ctx.imageSmoothingQuality  = "high";

        const renderTask = page.render({ canvasContext: ctx, viewport });
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
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [doc, pageNumber, effectiveZoom, wrapperWidth]);

  return (
    <div ref={wrapperRef} style={{ width: "100%", lineHeight: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}