"use client";

import { useEffect, useState } from "react";
import { usePdfDocument } from "@/lib/usePdfDocument";
import { PdfCanvas } from "@/components/PdfCanvas";
import { SignatureModal } from "@/components/SignatureModal";
import type { SignatureBox } from "@/lib/types";

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
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [signedByName, setSignedByName] = useState("");

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

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={boxPx}
          className={`absolute flex items-center justify-center rounded border-2 transition-colors ${
            signatureDataUrl
              ? "border-transparent hover:border-blue-400"
              : "animate-pulse border-blue-600 bg-blue-500/10 hover:bg-blue-500/20"
          }`}
        >
          {signatureDataUrl ? (
            /* Podpis vzniká až v prehliadači ako data URL, optimalizácia cez
               next/image tu nedáva zmysel. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={signatureDataUrl}
              alt="Váš podpis"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="px-1 text-center text-xs font-medium text-blue-700">
              Kliknite sem a podpíšte sa
            </span>
          )}
        </button>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {signatureDataUrl ? (
          <p className="text-center text-sm text-zinc-500">
            Podpis je vložený v dokumente.{" "}
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => setModalOpen(true)}
            >
              Zmeniť
            </button>
          </p>
        ) : (
          <p className="text-center text-sm text-amber-600">
            Kliknite na vyznačené miesto v dokumente a podpíšte sa.
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Vaše meno (nepovinné, zobrazí sa pri podpise)
          <input
            className="rounded border px-3 py-2"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            placeholder="Jana Nováková"
          />
        </label>

        <button
          type="button"
          disabled={!signatureDataUrl || submitting}
          onClick={() => signatureDataUrl && onSubmit(signatureDataUrl, signedByName)}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {submitting ? "Podpisujem…" : "Odoslať podpísaný dokument"}
        </button>
      </div>

      {modalOpen && (
        <SignatureModal
          onCancel={() => setModalOpen(false)}
          onConfirm={(dataUrl) => {
            setSignatureDataUrl(dataUrl);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
