import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

type DB = { documents: DocumentRecord[] };

// Serializes writes so concurrent requests never clobber each other's
// changes to the single JSON file backing this store.
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(fn, fn);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ documents: [] } satisfies DB, null, 2));
  }
}

async function readDB(): Promise<DB> {
  await ensureDataDir();
  const raw = await fs.readFile(DB_FILE, "utf-8");
  return JSON.parse(raw) as DB;
}

async function writeDB(db: DB) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

export function documentDir(id: string) {
  return path.join(UPLOADS_DIR, id);
}

export async function createDocument(data: {
  id: string;
  token: string;
  originalFilename: string;
}): Promise<DocumentRecord> {
  return serialize(async () => {
    const db = await readDB();
    const doc: DocumentRecord = {
      ...data,
      createdAt: new Date().toISOString(),
      status: "draft",
    };
    db.documents.push(doc);
    await writeDB(db);
    return doc;
  });
}

/** Všetky dokumenty, najnovšie ako prvé. */
export async function listDocuments(): Promise<DocumentRecord[]> {
  const db = await readDB();
  return [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const db = await readDB();
  return db.documents.find((d) => d.id === id) ?? null;
}

export async function getDocumentByToken(token: string): Promise<DocumentRecord | null> {
  const db = await readDB();
  return db.documents.find((d) => d.token === token) ?? null;
}

export async function updateDocument(
  id: string,
  patch: Partial<DocumentRecord>,
): Promise<DocumentRecord> {
  return serialize(async () => {
    const db = await readDB();
    const idx = db.documents.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error("Dokument sa nenašiel");
    db.documents[idx] = { ...db.documents[idx], ...patch };
    await writeDB(db);
    return db.documents[idx];
  });
}
