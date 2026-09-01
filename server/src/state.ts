import type { AppState } from "./types.js";
import { loadState, saveState } from "./xlsx/store.js";

/** Pas de cache en mémoire : en environnement serverless (Vercel), chaque requête peut
 * atterrir sur une instance différente, donc l'état est toujours relu depuis le stockage
 * (Vercel Blob en prod, fichier local en dev) puis réécrit après mutation. */
export async function getState(): Promise<AppState> {
  return loadState();
}

export async function mutate<T>(fn: (state: AppState) => T): Promise<T> {
  const state = await loadState();
  const result = fn(state);
  await saveState(state);
  return result;
}
