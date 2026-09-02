import type { AppState } from "./types.js";
import { loadState, saveState } from "./xlsx/store.js";

/** Pas de cache en mémoire : en environnement serverless (Vercel), chaque requête peut
 * atterrir sur une instance différente, donc l'état est toujours relu depuis le stockage
 * (Vercel Blob en prod, fichier local en dev) puis réécrit après mutation. */

const STORAGE_TIMEOUT_MS = 9000;

/** Filet de sécurité indépendant du SDK utilisé : si une opération de stockage (Blob, disque)
 * pend anormalement longtemps (réseau, DNS, bug de SDK...), on échoue proprement plutôt que de
 * laisser la requête sans réponse jusqu'au timeout de la plateforme (504). */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout (${STORAGE_TIMEOUT_MS}ms) sur ${label}`)),
      STORAGE_TIMEOUT_MS
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function getState(): Promise<AppState> {
  return withTimeout(loadState(), "loadState");
}

export async function mutate<T>(fn: (state: AppState) => T): Promise<T> {
  const state = await withTimeout(loadState(), "loadState");
  const result = fn(state);
  await withTimeout(saveState(state), "saveState");
  return result;
}
