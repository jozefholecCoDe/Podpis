"use client";

import { useEffect, useRef, useState } from "react";
import { usePdfDocument } from "@/lib/usePdfDocument";
import { PdfCanvas } from "@/components/PdfCanvas";
import type { SignatureBox } from "@/lib/types";

type DragState = { startX: number; startY: number; curX: number; curY: number };

export function MarkSignatureEditor({
  docId,
  fileUrl,
  onSent,
}: {
  docId: string;
  fileUrl: string;
  onSent: (signingUrl: string) => void;
}) {
  const { pdf, numPages, error: pdfError } = usePdfDocument(fileUrl);

  const [renderWidth, setRenderWidth] = useState(700);
  const [pageNumber, setPageNumber] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: renderWidth, height: renderWidth * 1.4 });
  const [box, setBox] = useState<SignatureBox | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = Math.max(320, Math.min(760, window.innerWidth - 96));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderWidth(w);
  }, []);

  function pointFromEvent(e: React.PointerEvent) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = pointFromEvent(e);
    setDrag({ startX: x, startY: y, curX: x, curY: y });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = pointFromEvent(e);
    setDrag((d) => (d ? { ...d, curX: x, curY: y } : d));
  }

  function handlePointerUp() {
    if (!drag) return;
    const { width: cw, height: ch } = canvasSize;
    let x0 = Math.min(drag.startX, drag.curX);
    let y0 = Math.min(drag.startY, drag.curY);
    let w = Math.abs(drag.curX - drag.startX);
    let h = Math.abs(drag.curY - drag.startY);

    // Treat a simple click (no real drag) as "place a default-sized box here".
    if (w < 6 && h < 6) {
      w = Math.min(cw * 0.32, 220);
      h = Math.min(ch * 0.09, 70);
      x0 = Math.min(Math.max(drag.startX - w / 2, 0), cw - w);
      y0 = Math.min(Math.max(drag.startY - h / 2, 0), ch - h);
    }

    setBox({
      page: pageNumber - 1,
      x: x0 / cw,
      y: y0 / ch,
      width: w / cw,
      height: h / ch,
    });
    setDrag(null);
  }

  const currentPageBoxPx =
    box && box.page === pageNumber - 1
      ? {
          left: box.x * canvasSize.width,
          top: box.y * canvasSize.height,
          width: box.width * canvasSize.width,
          height: box.height * canvasSize.height,
        }
      : null;

  const previewBoxPx = drag
    ? {
        left: Math.min(drag.startX, drag.curX),
        top: Math.min(drag.startY, drag.curY),
        width: Math.abs(drag.curX - drag.startX),
        height: Math.abs(drag.curY - drag.startY),
      }
    : null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail);
  const canSubmit = Boolean(box) && emailValid && !submitting;

  async function handleSubmit() {
    if (!box) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${docId}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ box, signerName, signerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Odoslanie zlyhalo.");
      onSent(data.signingUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odoslanie zlyhalo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pdfError) {
    return <p className="text-red-600">{pdfError}</p>;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex flex-col items-center gap-3">
        {numPages > 1 && (
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              className="rounded border px-2 py-1 disabled:opacity-40"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              ← Predchádzajúca
            </button>
            <span>
              Strana {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              className="rounded border px-2 py-1 disabled:opacity-40"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              Ďalšia →
            </button>
          </div>
        )}

        <div
          ref={wrapperRef}
          className="relative touch-none"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {pdf && (
            <PdfCanvas
              pdf={pdf}
              pageNumber={pageNumber}
              width={renderWidth}
              onRendered={setCanvasSize}
            />
          )}

          <div className="absolute inset-0 cursor-crosshair" />

          {currentPageBoxPx && !drag && (
            <div
              className="absolute flex items-center justify-center rounded border-2 border-blue-600 bg-blue-500/10 text-xs font-medium text-blue-700"
              style={currentPageBoxPx}
            >
              Podpis
            </div>
          )}
          {previewBoxPx && (
            <div
              className="absolute rounded border-2 border-dashed border-blue-500 bg-blue-500/10"
              style={previewBoxPx}
            />
          )}
        </div>

        <p className="max-w-md text-center text-sm text-zinc-500">
          Kliknutím alebo ťahaním myšou vyznačte na dokumente miesto, kam sa má vložiť podpis.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <h2 className="text-lg font-semibold">Odoslať na podpis</h2>
        <label className="flex flex-col gap-1 text-sm">
          Meno podpisujúceho (nepovinné)
          <input
            className="rounded border px-3 py-2"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Jana Nováková"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email podpisujúceho
          <input
            type="email"
            required
            className="rounded border px-3 py-2"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="jana@example.com"
          />
        </label>

        {!box && <p className="text-sm text-amber-600">Najprv vyznačte miesto na podpis.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {submitting ? "Odosielam…" : "Odoslať odkaz na podpis emailom"}
        </button>
      </div>
    </div>
  );
}
