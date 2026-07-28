"use client";

import { useEffect, useRef, useState } from "react";
import { usePdfDocument } from "@/lib/usePdfDocument";
import { PdfCanvas } from "@/components/PdfCanvas";
import type { SignatureBox } from "@/lib/types";

/** Hrúbka ťahu v CSS pixeloch. */
const SIGNATURE_LINE_WIDTH = 1.5;
/** Farba atramentu. */
const SIGNATURE_COLOR = "#0f172a";
/**
 * Podpis sa kreslí do plochy niekoľkonásobne väčšej, než akú vidno na
 * obrazovke — výsledný PNG sa vkladá do PDF, kde by inak (najmä po vytlačení)
 * bola tenká čiara zubatá.
 */
const SIGNATURE_SUPERSAMPLE = 4;

export function SigningPad({
  fileUrl,
  box,
  onSubmit,
  submitting,
}: {
  fileUrl: string;
  box: SignatureBox;
  onSubmit: (signatureDataUrl: string, signedByName: string) => void;
  submitting: boolean;
}) {
  const { pdf, error: pdfError } = usePdfDocument(fileUrl);

  const [renderWidth, setRenderWidth] = useState(700);
  const [canvasSize, setCanvasSize] = useState({ width: renderWidth, height: renderWidth * 1.4 });
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signedByName, setSignedByName] = useState("");
  const isDrawingRef = useRef(false);

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const w = Math.max(320, Math.min(760, window.innerWidth - 96));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderWidth(w);
  }, []);

  const boxPx = {
    left: box.x * canvasSize.width,
    top: box.y * canvasSize.height,
    width: box.width * canvasSize.width,
    height: box.height * canvasSize.height,
  };

  // (Re)size the drawable signature canvas whenever the underlying page
  // box changes size (e.g. once the PDF page has finished rendering).
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const scale = Math.max(window.devicePixelRatio || 1, SIGNATURE_SUPERSAMPLE);
    const w = Math.max(1, Math.round(boxPx.width));
    const h = Math.max(1, Math.round(boxPx.height));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.lineWidth = SIGNATURE_LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = SIGNATURE_COLOR;
    sigCtxRef.current = ctx;
    setHasDrawn(false);
  }, [boxPx.width, boxPx.height]);

  function relativePoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = sigCtxRef.current;
    if (!ctx) return;
    const { x, y } = relativePoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const ctx = sigCtxRef.current;
    if (!ctx) return;
    const { x, y } = relativePoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function handleClear() {
    const canvas = sigCanvasRef.current;
    const ctx = sigCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSubmit() {
    const canvas = sigCanvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSubmit(canvas.toDataURL("image/png"), signedByName);
  }

  if (pdfError) {
    return <p className="text-red-600">{pdfError}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
        {pdf && (
          <PdfCanvas
            pdf={pdf}
            pageNumber={box.page + 1}
            width={renderWidth}
            onRendered={setCanvasSize}
          />
        )}

        <div
          className="absolute rounded border-2 border-blue-600 bg-white/40"
          style={boxPx}
        >
          <canvas
            ref={sigCanvasRef}
            className="touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Vaše meno (nepovinné, zobrazí sa pri podpise)
          <input
            className="rounded border px-3 py-2"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            placeholder="Jana Nováková"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded border px-4 py-2 text-sm"
          >
            Vymazať
          </button>
          <button
            type="button"
            disabled={!hasDrawn || submitting}
            onClick={handleSubmit}
            className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Podpisujem…" : "Podpísať dokument"}
          </button>
        </div>
        <p className="text-center text-xs text-zinc-500">
          Podpíšte prstom alebo myšou priamo do modrého rámčeka na dokumente.
        </p>
      </div>
    </div>
  );
}
