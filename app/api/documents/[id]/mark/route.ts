import { NextResponse } from "next/server";
import { getDocument, updateDocument } from "@/lib/store";
import { getDefaultOwnerEmail, sendSigningEmail } from "@/lib/mail";
import { getBaseUrl } from "@/lib/url";
import type { SignatureBox } from "@/lib/types";

export const runtime = "nodejs";

function isValidBox(box: unknown): box is SignatureBox {
  if (!box || typeof box !== "object") return false;
  const b = box as Record<string, unknown>;
  return (
    typeof b.page === "number" &&
    typeof b.x === "number" &&
    typeof b.y === "number" &&
    typeof b.width === "number" &&
    typeof b.height === "number" &&
    b.width > 0 &&
    b.height > 0
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request, ctx: RouteContext<"/api/documents/[id]/mark">) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Dokument sa nenašiel." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const box = body?.box;
  const signerName = typeof body?.signerName === "string" ? body.signerName.trim() : "";
  const signerEmail = typeof body?.signerEmail === "string" ? body.signerEmail.trim() : "";
  const ownerEmailInput = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim() : "";

  if (!isValidBox(box)) {
    return NextResponse.json({ error: "Neplatné miesto na podpis." }, { status: 400 });
  }
  if (!signerEmail || !EMAIL_RE.test(signerEmail)) {
    return NextResponse.json({ error: "Zadajte platný email podpisujúceho." }, { status: 400 });
  }
  if (ownerEmailInput && !EMAIL_RE.test(ownerEmailInput)) {
    return NextResponse.json(
      { error: "Zadajte platný email pre doručenie podpísaného dokumentu." },
      { status: 400 },
    );
  }

  // Left blank, the signed document goes back to the address it was sent from.
  const ownerEmail = ownerEmailInput || getDefaultOwnerEmail();

  const signingUrl = `${getBaseUrl(request)}/sign/${doc.token}`;

  try {
    await sendSigningEmail({
      to: signerEmail,
      signerName,
      documentName: doc.originalFilename,
      signingUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Odoslanie emailu zlyhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await updateDocument(id, {
    signatureBox: box,
    signerName,
    signerEmail,
    ownerEmail,
    status: "pending",
    sentAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, signingUrl });
}
