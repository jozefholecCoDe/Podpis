import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocumentByToken, updateDocument } from "@/lib/store";
import { embedSignatureImage } from "@/lib/embedSignature";

export const runtime = "nodejs";

export async function POST(request: Request, ctx: RouteContext<"/api/sign/[token]/submit">) {
  const { token } = await ctx.params;
  const doc = await getDocumentByToken(token);
  if (!doc || !doc.signatureBox) {
    return NextResponse.json({ error: "Odkaz na podpis sa nenašiel." }, { status: 404 });
  }
  if (doc.status === "signed") {
    return NextResponse.json({ error: "Tento dokument je už podpísaný." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const signatureDataUrl = body?.signatureDataUrl;
  const signedByName = typeof body?.signedByName === "string" ? body.signedByName.trim() : "";

  if (typeof signatureDataUrl !== "string" || !signatureDataUrl.startsWith("data:image/png")) {
    return NextResponse.json({ error: "Chýba podpis." }, { status: 400 });
  }

  const dir = documentDir(doc.id);
  const pdfBytes = await fs.readFile(path.join(dir, "document.pdf"));

  let signedBytes: Uint8Array;
  try {
    signedBytes = await embedSignatureImage({
      pdfBytes,
      signaturePngDataUrl: signatureDataUrl,
      box: doc.signatureBox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vloženie podpisu zlyhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await fs.writeFile(path.join(dir, "signed.pdf"), signedBytes);
  await updateDocument(doc.id, {
    status: "signed",
    signedAt: new Date().toISOString(),
    signedByName: signedByName || doc.signerName,
  });

  return NextResponse.json({ ok: true });
}
