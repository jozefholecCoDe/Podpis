"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkSignatureEditor } from "@/components/MarkSignatureEditor";

type DocInfo = {
  id: string;
  originalFilename: string;
  status: "draft" | "pending" | "signed";
  signerEmail: string | null;
  ownerEmail: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signedEmailSentAt: string | null;
  signedEmailError: string | null;
  signingUrl: string | null;
};

export function DocumentStatus({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Dokument sa nenašiel.");
      setDoc(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dokument sa nenašiel.");
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Poll while the document is waiting on a signature so this page flips
  // to the "signed" view on its own once the signer is done.
  useEffect(() => {
    if (doc?.status !== "pending") return;
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [doc?.status, refresh]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!doc) return <p className="text-zinc-500">Načítavam…</p>;

  if (doc.status === "draft") {
    return (
      <MarkSignatureEditor
        docId={doc.id}
        documentName={doc.originalFilename}
        fileUrl={`/api/documents/${doc.id}/file`}
        onSent={() => refresh()}
      />
    );
  }

  if (doc.status === "pending") {
    return (
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-semibold">Odkaz na podpis bol odoslaný</h2>
        <p className="text-zinc-500">
          Emailová správa s odkazom na podpísanie bola odoslaná na{" "}
          <strong>{doc.signerEmail}</strong>. Táto stránka sa automaticky aktualizuje, keď
          dokument podpíšu.
        </p>
        {doc.signingUrl && (
          <div className="flex w-full items-center gap-2">
            <input
              readOnly
              value={doc.signingUrl}
              className="flex-1 rounded border px-3 py-2 text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm"
              onClick={() => {
                navigator.clipboard.writeText(doc.signingUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Skopírované!" : "Kopírovať"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col items-center gap-3 text-center">
      <h2 className="text-xl font-semibold">Dokument je podpísaný ✅</h2>
      {doc.signedAt && (
        <p className="text-zinc-500">
          Podpísané {new Date(doc.signedAt).toLocaleString("sk-SK")}
        </p>
      )}
      {doc.signedEmailSentAt && doc.ownerEmail && (
        <p className="text-sm text-zinc-500">
          Podpísaný dokument bol odoslaný emailom na <strong>{doc.ownerEmail}</strong>.
        </p>
      )}
      {doc.signedEmailError && (
        <p className="text-sm text-amber-600">
          Podpísaný dokument sa nepodarilo odoslať emailom ({doc.signedEmailError}) — stiahnite si
          ho nižšie.
        </p>
      )}
      <a
        href={`/api/documents/${doc.id}/signed-file`}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Stiahnuť podpísaný dokument
      </a>
    </div>
  );
}
