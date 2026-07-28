/** "zmluva.docx" -> "zmluva-podpisane.pdf" */
export function signedFilename(originalFilename: string) {
  const base = originalFilename.replace(/\.[^.]+$/, "") || "dokument";
  return `${base}-podpisane.pdf`;
}

/**
 * Builds a Content-Disposition header that survives non-ASCII filenames:
 * a sanitized ASCII fallback plus the RFC 5987 `filename*` form.
 */
export function contentDisposition(type: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replaceAll('"', "'");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
