"use client";

/**
 * Oreže nakreslený podpis na skutočný obsah, aby sa dal do rámčeka v dokumente
 * vložiť pekne na celú plochu bez ohľadu na to, kde presne na kresliacej ploche
 * sa podpisujúci podpísal.
 *
 * `minFraction` bráni tomu, aby sa drobný podpis nakreslený v rohu nafúkol na
 * celý rámček — vtedy by čiara pôsobila neprimerane hrubo.
 */
export function cropSignatureToInk(
  canvas: HTMLCanvasElement,
  minFraction = 0.35,
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas.toDataURL("image/png");

  const pad = Math.round(Math.max(width, height) * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  let cropWidth = maxX - minX + 1;
  let cropHeight = maxY - minY + 1;

  const minWidth = Math.min(width, width * minFraction);
  if (cropWidth < minWidth) {
    const center = minX + cropWidth / 2;
    minX = Math.round(Math.min(Math.max(0, center - minWidth / 2), width - minWidth));
    cropWidth = Math.round(minWidth);
  }
  const minHeight = Math.min(height, height * minFraction);
  if (cropHeight < minHeight) {
    const center = minY + cropHeight / 2;
    minY = Math.round(Math.min(Math.max(0, center - minHeight / 2), height - minHeight));
    cropHeight = Math.round(minHeight);
  }

  const out = document.createElement("canvas");
  out.width = cropWidth;
  out.height = cropHeight;
  const outCtx = out.getContext("2d");
  if (!outCtx) return canvas.toDataURL("image/png");
  outCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return out.toDataURL("image/png");
}
