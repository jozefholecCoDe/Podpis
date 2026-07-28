"use client";

import { useEffect, useState } from "react";
import { SigningPad } from "@/components/SigningPad";
import type { SignatureBox } from "@/lib/types";

type SignInfo = {
  originalFilename: string;
  status: "pending" | "signed";
  signatureBox: SignatureBox;
  signerName: string | null;
  signedAt: string | null;
};

export function SigningView({ token }: { token: string }) {
  const [info, setInfo] = useState<SignInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    fetch(`/api/sign/${token}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Odkaz na podpis sa nenašiel.");
        setInfo(data);
        if (data.status === "signed") setSigned(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chyba."));
  }, [token]);

  async function handleSubmit(signatureDataUrl: string, signedByName: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, signedByName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Podpísanie zlyhalo.");
      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Podpísanie zlyhalo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!info) return <p className="text-zinc-500">Načítavam…</p>;

  if (signed) {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-semibold">Ďakujeme, dokument je podpísaný ✅</h2>
        <p className="text-zinc-500">{info.originalFilename}</p>
        <a
          href={`/api/sign/${token}/download`}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Stiahnuť podpísaný dokument
        </a>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="text-zinc-500">
        Dokument na podpis: <strong>{info.originalFilename}</strong>
      </p>
      {error && <p className="text-red-600">{error}</p>}
      <SigningPad
        fileUrl={`/api/sign/${token}/file`}
        box={info.signatureBox}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
