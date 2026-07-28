import { NextResponse } from "next/server";
import { getDocument } from "@/lib/store";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Dokument sa nenašiel." }, { status: 404 });
  }

  const signingUrl =
    doc.status === "draft" ? null : `${getBaseUrl(request)}/sign/${doc.token}`;

  return NextResponse.json({
    id: doc.id,
    originalFilename: doc.originalFilename,
    status: doc.status,
    signatureBox: doc.signatureBox ?? null,
    signerName: doc.signerName ?? null,
    signerEmail: doc.signerEmail ?? null,
    ownerEmail: doc.ownerEmail ?? null,
    sentAt: doc.sentAt ?? null,
    signedAt: doc.signedAt ?? null,
    signedEmailSentAt: doc.signedEmailSentAt ?? null,
    signedEmailError: doc.signedEmailError ?? null,
    signingUrl,
  });
}
