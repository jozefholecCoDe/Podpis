import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocumentByToken } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/sign/[token]/file">) {
  const { token } = await ctx.params;
  const doc = await getDocumentByToken(token);
  if (!doc) {
    return NextResponse.json({ error: "Odkaz na podpis sa nenašiel." }, { status: 404 });
  }

  const filePath = path.join(documentDir(doc.id), "document.pdf");
  const bytes = await fs.readFile(filePath);

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalFilename)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
