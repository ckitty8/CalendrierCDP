import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const LOCAL_STORE_PATH = path.join(DATA_DIR, "store.xlsx");
const BLOB_PATHNAME = "calendriercdp/store.xlsx";

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** true en environnement Vercel avec Blob storage activé (variable injectée automatiquement
 * quand le Blob store est relié au projet). En local (pas de token), on retombe sur le disque. */
function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readStoreBytes(): Promise<Buffer | null> {
  if (useBlob()) {
    const { head } = await import("@vercel/blob");
    try {
      const info = await head(BLOB_PATHNAME);
      const res = await fetch(info.url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null; // pas encore créé
    }
  }
  ensureDataDir();
  if (!fs.existsSync(LOCAL_STORE_PATH)) return null;
  return fs.readFileSync(LOCAL_STORE_PATH);
}

export async function writeStoreBytes(buf: Buffer): Promise<void> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    await put(BLOB_PATHNAME, buf, {
      access: "public",
      allowOverwrite: true,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return;
  }
  ensureDataDir();
  const tmp = LOCAL_STORE_PATH + ".tmp";
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, LOCAL_STORE_PATH);
}

export function dataDir(): string {
  return DATA_DIR;
}
