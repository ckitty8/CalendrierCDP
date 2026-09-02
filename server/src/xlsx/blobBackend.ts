import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Le système de fichiers d'une fonction Vercel est en lecture seule, à l'exception de
 * /tmp. En local (dev), on utilise server/data pour que le fichier soit inspectable. */
const DATA_DIR = process.env.VERCEL
  ? "/tmp/calendriercdp-data"
  : path.resolve(__dirname, "../../data");
const LOCAL_STORE_PATH = path.join(DATA_DIR, "store.xlsx");
const BLOB_PATHNAME = "calendriercdp/store.xlsx";

// Toute opération réseau (Blob) est bornée dans le temps : sans ça, un souci réseau ou un
// token invalide peut faire pendre la requête jusqu'au timeout de la plateforme (504) plutôt
// que d'échouer proprement.
const BLOB_TIMEOUT_MS = 8000;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** true en environnement Vercel avec Blob storage activé (variable injectée automatiquement
 * quand le Blob store est relié au projet). Sinon on retombe sur le disque (server/data en
 * local, /tmp sur Vercel — mais /tmp n'est pas persistant entre invocations : ajouter le
 * Blob store est nécessaire pour une vraie persistance en production). */
function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readStoreBytes(): Promise<Buffer | null> {
  if (useBlob()) {
    try {
      const { head } = await import("@vercel/blob");
      const info = await head(BLOB_PATHNAME, { abortSignal: AbortSignal.timeout(BLOB_TIMEOUT_MS) });
      const res = await fetch(info.url, { signal: AbortSignal.timeout(BLOB_TIMEOUT_MS) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // "not_found" = le blob n'existe pas encore (premier démarrage) : cas normal, pas une erreur.
      if (message.toLowerCase().includes("not_found") || message.toLowerCase().includes("not found")) {
        return null;
      }
      throw new Error(`Lecture Vercel Blob échouée : ${message}`);
    }
  }
  try {
    ensureDataDir();
    if (!fs.existsSync(LOCAL_STORE_PATH)) return null;
    return fs.readFileSync(LOCAL_STORE_PATH);
  } catch (err) {
    throw new Error(
      `Impossible de lire le stockage local (${LOCAL_STORE_PATH}) : ${(err as Error).message}. ` +
        `En production sur Vercel, ajoute le Blob storage au projet (variable BLOB_READ_WRITE_TOKEN).`
    );
  }
}

export async function writeStoreBytes(buf: Buffer): Promise<void> {
  if (useBlob()) {
    try {
      const { put } = await import("@vercel/blob");
      await put(BLOB_PATHNAME, buf, {
        access: "public",
        allowOverwrite: true,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        abortSignal: AbortSignal.timeout(BLOB_TIMEOUT_MS),
      });
    } catch (err) {
      throw new Error(`Écriture Vercel Blob échouée : ${(err as Error).message}`);
    }
    return;
  }
  try {
    ensureDataDir();
    const tmp = LOCAL_STORE_PATH + ".tmp";
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, LOCAL_STORE_PATH);
  } catch (err) {
    throw new Error(
      `Impossible d'écrire le stockage local (${LOCAL_STORE_PATH}) : ${(err as Error).message}. ` +
        `En production sur Vercel, ajoute le Blob storage au projet (variable BLOB_READ_WRITE_TOKEN).`
    );
  }
}

export function dataDir(): string {
  return DATA_DIR;
}
