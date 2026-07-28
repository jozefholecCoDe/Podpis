import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocument } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/documents/[id]/signed-file">,
) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  if (!doc || doc.status !== "signed") {
    return NextResponse.json({ error: "Podpísaný dokument sa nenašiel." }, { status: 404 });
  }

  const filePath = path.join(documentDir(id), "signed.pdf");
  const bytes = await fs.readFile(filePath);

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="podpisany-${encodeURIComponent(doc.originalFilename)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
