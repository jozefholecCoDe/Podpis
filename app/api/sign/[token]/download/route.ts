import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { documentDir, getDocumentByToken } from "@/lib/store";
import { contentDisposition, signedFilename } from "@/lib/filenames";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/sign/[token]/download">) {
  const { token } = await ctx.params;
  const doc = await getDocumentByToken(token);
  if (!doc || doc.status !== "signed") {
    return NextResponse.json({ error: "Podpísaný dokument sa nenašiel." }, { status: 404 });
  }

  const filePath = path.join(documentDir(doc.id), "signed.pdf");
  const bytes = await fs.readFile(filePath);

  return new NextResponse(new Blob([bytes]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition(
        "attachment",
        signedFilename(doc.originalFilename),
      ),
      "Cache-Control": "no-store",
    },
  });
}
