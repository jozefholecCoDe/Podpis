import { NextResponse } from "next/server";
import { getDocumentByToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/sign/[token]">) {
  const { token } = await ctx.params;
  const doc = await getDocumentByToken(token);
  if (!doc || !doc.signatureBox) {
    return NextResponse.json({ error: "Odkaz na podpis sa nenašiel." }, { status: 404 });
  }

  return NextResponse.json({
    originalFilename: doc.originalFilename,
    status: doc.status,
    signatureBox: doc.signatureBox,
    signerName: doc.signerName ?? null,
    signedAt: doc.signedAt ?? null,
  });
}
