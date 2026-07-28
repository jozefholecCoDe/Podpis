"use client";

import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "@/lib/pdfjsClient";

export function PdfCanvas({
  pdf,
  pageNumber,
  width,
  onRendered,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  onRendered: (size: { width: number; height: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const unscaled = page.getViewport({ scale: 1 });
      const scale = width / unscaled.width;
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.round(viewport.width * dpr);
      canvas.height = Math.round(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTask = page.render({ canvasContext: ctx, viewport });
      await renderTask.promise;
      if (cancelled) return;
      onRendered({ width: viewport.width, height: viewport.height });
    })().catch((err) => {
      if (!cancelled && err?.name !== "RenderingCancelledException") {
        console.error(err);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
    // onRendered is a stable setState setter passed by callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, pageNumber, width]);

  return (
    <canvas ref={canvasRef} className="block select-none rounded bg-white shadow" />
  );
}
