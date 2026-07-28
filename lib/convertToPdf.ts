import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

const execFileAsync = promisify(execFile);

/**
 * Converts an office document (.docx, .doc, .odt, ...) to PDF using a headless
 * LibreOffice install. Each call gets its own profile dir so concurrent
 * conversions don't fight over LibreOffice's user-profile lock.
 */
export async function convertToPdf(inputPath: string, outDir: string): Promise<string> {
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "lo-profile-"));
  try {
    await execFileAsync(
      "soffice",
      [
        "--headless",
        "--norestore",
        `-env:UserInstallation=file://${profileDir}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outDir,
        inputPath,
      ],
      { timeout: 60_000 },
    );
  } catch (err) {
    throw new Error(
      "Konverzia dokumentu na PDF zlyhala. Uistite sa, že je na serveri nainštalovaný LibreOffice (príkaz `soffice`).",
      { cause: err },
    );
  } finally {
    await fs.rm(profileDir, { recursive: true, force: true });
  }

  const base = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outDir, `${base}.pdf`);
  await fs.access(outputPath);
  return outputPath;
}
