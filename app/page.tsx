"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentList } from "@/components/DocumentList";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Nahranie zlyhalo.");
      router.push(`/documents/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nahranie zlyhalo.");
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Podpis dokumentu</h1>
        <p className="mt-2 text-zinc-500">
          Nahrajte dokument, vyznačte miesto na podpis a pošlite odkaz na podpísanie emailom.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.odt,.rtf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <p className="font-medium">Nahrávam a spracúvam dokument…</p>
        ) : (
          <>
            <p className="font-medium">Presuňte sem súbor alebo kliknite pre výber</p>
            <p className="text-sm text-zinc-500">Podporované formáty: PDF, DOCX, DOC, ODT, RTF</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DocumentList />
    </div>
  );
}
