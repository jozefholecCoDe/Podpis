import { PDFDocument } from "pdf-lib";
import type { SignatureBox } from "./types";

/**
 * Stamps a PNG signature image (as a data URL) onto a PDF at the given
 * normalized box. `box.y`/`box.x` are measured from the page's top-left
 * (matching how browsers lay out the marking/signing overlay), while
 * pdf-lib places content relative to the page's bottom-left origin, hence
 * the flip below.
 *
 * The image is fitted inside the box and centred rather than stretched to
 * fill it: the signer draws on a large pad whose shape has nothing to do with
 * the box, so stretching would visibly distort their signature.
 */
export async function embedSignatureImage(opts: {
  pdfBytes: Uint8Array;
  signaturePngDataUrl: string;
  box: SignatureBox;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(opts.pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[opts.box.page];
  if (!page) {
    throw new Error(`Dokument nemá stránku ${opts.box.page + 1}`);
  }
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const base64 = opts.signaturePngDataUrl.split(",")[1];
  if (!base64) throw new Error("Neplatný podpis (očakával sa PNG data URL)");
  const pngBytes = Uint8Array.from(Buffer.from(base64, "base64"));
  const pngImage = await pdfDoc.embedPng(pngBytes);

  const boxWidth = opts.box.width * pageWidth;
  const boxHeight = opts.box.height * pageHeight;

  const fit = Math.min(boxWidth / pngImage.width, boxHeight / pngImage.height);
  const drawWidth = pngImage.width * fit;
  const drawHeight = pngImage.height * fit;

  const x = opts.box.x * pageWidth + (boxWidth - drawWidth) / 2;
  const yFromTop = opts.box.y * pageHeight + (boxHeight - drawHeight) / 2;
  const y = pageHeight - yFromTop - drawHeight;

  page.drawImage(pngImage, { x, y, width: drawWidth, height: drawHeight });

  return pdfDoc.save();
}
