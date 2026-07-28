"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DocRow = {
  id: string;
  originalFilename: string;
  status: "draft" | "pending" | "signed";
  createdAt: string;
  signerEmail: string | null;
  signedAt: string | null;
  signedByName: string | null;
};

const STATUS_LABEL: Record<DocRow["status"], string> = {
  draft: "Nedokončené",
  pending: "Čaká na podpis",
  signed: "Podpísané",
};

const STATUS_STYLE: Record<DocRow["status"], string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  signed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export function DocumentList() {
  const [docs, setDocs] = useState<DocRow[] | null>(null);

  useEffect(() => {
    fetch("/api/documents", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  if (!docs || docs.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="mb-3 text-lg font-semibold">Vaše dokumenty</h2>
      <ul className="divide-y rounded-xl border dark:divide-zinc-800 dark:border-zinc-800">
        {docs.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/documents/${doc.id}`}
                className="block truncate font-medium hover:underline"
              >
                {doc.originalFilename}
              </Link>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {doc.status === "signed" && doc.signedAt
                  ? `Podpísané ${new Date(doc.signedAt).toLocaleString("sk-SK")}`
                  : doc.status === "pending" && doc.signerEmail
                    ? `Odoslané na ${doc.signerEmail}`
                    : `Nahrané ${new Date(doc.createdAt).toLocaleString("sk-SK")}`}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[doc.status]}`}
            >
              {STATUS_LABEL[doc.status]}
            </span>

            {doc.status === "signed" && (
              <a
                href={`/api/documents/${doc.id}/signed-file`}
                className="shrink-0 rounded border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Stiahnuť
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
