import type { AppState } from "./types.js";
import { loadState, saveState } from "./xlsx/store.js";

let current: AppState | null = null;

export async function getState(): Promise<AppState> {
  if (!current) current = await loadState();
  return current;
}

export async function mutate<T>(fn: (state: AppState) => T): Promise<T> {
  const state = await getState();
  const result = fn(state);
  await saveState(state);
  return result;
}
