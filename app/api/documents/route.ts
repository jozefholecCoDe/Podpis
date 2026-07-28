import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createDocument, documentDir, listDocuments } from "@/lib/store";
import { convertToPdf } from "@/lib/convertToPdf";

export const runtime = "nodejs";

const PDF_EXTENSIONS = new Set([".pdf"]);
const OFFICE_EXTENSIONS = new Set([".docx", ".doc", ".odt", ".rtf"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json(
    documents.map((doc) => ({
      id: doc.id,
      originalFilename: doc.originalFilename,
      status: doc.status,
      createdAt: doc.createdAt,
      signerEmail: doc.signerEmail ?? null,
      signedAt: doc.signedAt ?? null,
      signedByName: doc.signedByName ?? null,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Chýba súbor (pole 'file')." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Nahraný súbor je prázdny." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Súbor je príliš veľký (max 25 MB)." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!PDF_EXTENSIONS.has(ext) && !OFFICE_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: "Podporované sú iba súbory PDF, DOCX, DOC, ODT alebo RTF." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const dir = documentDir(id);
  await fs.mkdir(dir, { recursive: true });

  const originalPath = path.join(dir, `original${ext}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(originalPath, bytes);

  const pdfPath = path.join(dir, "document.pdf");
  try {
    if (PDF_EXTENSIONS.has(ext)) {
      await fs.copyFile(originalPath, pdfPath);
    } else {
      const convertedPath = await convertToPdf(originalPath, dir);
      if (convertedPath !== pdfPath) {
        await fs.rename(convertedPath, pdfPath);
      }
    }
  } catch (err) {
    await fs.rm(dir, { recursive: true, force: true });
    const message = err instanceof Error ? err.message : "Spracovanie dokumentu zlyhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await createDocument({ id, token, originalFilename: file.name });

  return NextResponse.json({ id }, { status: 201 });
}
