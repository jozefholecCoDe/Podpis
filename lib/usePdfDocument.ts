"use client";

import { useEffect, useState } from "react";
import { getPdfjs, type PDFDocumentProxy } from "@/lib/pdfjsClient";

export function usePdfDocument(fileUrl: string | null) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;

    getPdfjs()
      .getDocument({ url: fileUrl })
      .promise.then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Nepodarilo sa načítať PDF.");
      });

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return { pdf, numPages, error };
}
