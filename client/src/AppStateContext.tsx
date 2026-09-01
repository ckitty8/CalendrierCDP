import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppState } from "./types";
import { api } from "./api";

interface Ctx {
  state: AppState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AppStateCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const s = await api.getState();
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AppStateCtx.Provider value={{ state, loading, error, refresh }}>{children}</AppStateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
