import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocument } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Dokument sa nenašiel." }, { status: 404 });
  }

  const filePath = path.join(documentDir(id), "document.pdf");
  const bytes = await fs.readFile(filePath);

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalFilename)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
