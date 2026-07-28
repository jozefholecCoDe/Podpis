"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hrúbka ťahu ako podiel šírky kresliacej plochy. Vďaka tomu vyjde čiara vo
 * výslednom PDF rovnako hrubá bez ohľadu na to, aké veľké okno má podpisujúci
 * k dispozícii — na mobile aj na monitore.
 */
const SIGNATURE_LINE_RATIO = 0.0033;
const SIGNATURE_COLOR = "#0f172a";
const SIGNATURE_SUPERSAMPLE = 3;

export function SignatureModal({
  aspect,
  onConfirm,
  onCancel,
}: {
  /** pomer strán podpisového rámčeka v dokumente, aby sa podpis nedeformoval */
  aspect: number;
  onConfirm: (signatureDataUrl: string) => void;
  onCancel: () => void;
}) {
  const [size, setSize] = useState({ width: 480, height: 200 });
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 2.5;
    const maxWidth = Math.min(window.innerWidth - 48, 640);
    const maxHeight = Math.min(window.innerHeight * 0.5, 420);
    let width = maxWidth;
    let height = width / safeAspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * safeAspect;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSize({ width: Math.round(width), height: Math.round(height) });
  }, [aspect]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = Math.max(window.devicePixelRatio || 1, SIGNATURE_SUPERSAMPLE);
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.lineWidth = size.width * SIGNATURE_LINE_RATIO;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = SIGNATURE_COLOR;
    ctxRef.current = ctx;
    setHasDrawn(false);
  }, [size.width, size.height]);

  function pointFrom(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = pointFrom(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = pointFrom(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onConfirm(canvas.toDataURL("image/png"));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Podpíšte sa</h2>

        <div
          className="rounded-lg border-2 border-dashed border-zinc-300 bg-white dark:border-zinc-600"
          style={{ width: size.width, height: size.height }}
        >
          <canvas
            ref={canvasRef}
            className="touch-none"
            style={{ width: size.width, height: size.height }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <p className="text-center text-sm text-zinc-500">
          Podpíšte sa prstom alebo myšou do rámčeka.
        </p>

        <div className="flex w-full flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm"
          >
            Zrušiť
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="rounded border px-4 py-2 text-sm disabled:opacity-40"
          >
            Vymazať
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasDrawn}
            className="rounded bg-blue-600 px-5 py-2 font-medium text-white disabled:opacity-40"
          >
            Potvrdiť podpis
          </button>
        </div>
      </div>
    </div>
  );
}
