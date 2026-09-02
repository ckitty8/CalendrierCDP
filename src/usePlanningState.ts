import { useEffect, useState } from "react";
import type { DayEntry, Employee } from "./types";
import seedData from "./seedData.json";

const STORAGE_KEY = "calendriercdp-planning-v1";

export interface PlanningState {
  year: number;
  employees: Employee[];
  days: DayEntry[];
}

function loadInitial(): PlanningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PlanningState;
  } catch {
    // localStorage indisponible ou contenu corrompu : on repart du seed
  }
  return seedData as PlanningState;
}

export function usePlanningState() {
  const [state, setState] = useState<PlanningState>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // stockage plein/indisponible : on continue sans persister
    }
  }, [state]);

  return [state, setState] as const;
}
