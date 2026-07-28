import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocumentByToken, updateDocument } from "@/lib/store";
import { embedSignatureImage } from "@/lib/embedSignature";
import { getDefaultOwnerEmail, sendSignedDocumentEmail } from "@/lib/mail";
import { signedFilename } from "@/lib/filenames";
import { getBaseUrl } from "@/lib/url";

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
  const signedAt = new Date();
  const finalSignedByName = signedByName || doc.signerName || "";
  await updateDocument(doc.id, {
    status: "signed",
    signedAt: signedAt.toISOString(),
    signedByName: finalSignedByName,
  });

  // Mail the finished document back to whoever requested the signature. The
  // document is already signed and stored at this point, so a mail failure is
  // recorded and reported rather than failing the request — the signer has
  // done their part and both sides can still download it.
  const ownerEmail = doc.ownerEmail || getDefaultOwnerEmail();
  let emailSent = false;
  let emailError: string | null = null;

  if (ownerEmail) {
    try {
      await sendSignedDocumentEmail({
        to: ownerEmail,
        documentName: doc.originalFilename,
        signedByName: finalSignedByName,
        signedAt,
        documentUrl: `${getBaseUrl(request)}/documents/${doc.id}`,
        pdfBytes: signedBytes,
        attachmentFilename: signedFilename(doc.originalFilename),
      });
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Odoslanie emailu zlyhalo.";
    }
  } else {
    emailError = "Nie je nastavená adresa, na ktorú sa má podpísaný dokument poslať.";
  }

  await updateDocument(doc.id, {
    signedEmailSentAt: emailSent ? new Date().toISOString() : undefined,
    signedEmailError: emailError ?? undefined,
  });

  return NextResponse.json({ ok: true, emailSent, emailError, sentTo: emailSent ? ownerEmail : null });
}
