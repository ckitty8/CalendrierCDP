import { useEffect, useState } from "react";
import type { DayEntry, Employee, Project } from "./types";
import seedData from "./seedData.json";

const STORAGE_KEY = "calendriercdp-planning-v1";

export interface PlanningState {
  year: number;
  employees: Employee[];
  days: DayEntry[];
  projects: Project[];
}

function migrate(raw: Partial<PlanningState>): PlanningState {
  return {
    year: raw.year!,
    days: raw.days ?? [],
    projects: raw.projects ?? [],
    employees: (raw.employees ?? []).map((e) => ({ ...e, projectIds: e.projectIds ?? [] })),
  };
}

function loadInitial(): PlanningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // localStorage indisponible ou contenu corrompu : on repart du seed
  }
  return migrate(seedData as Partial<PlanningState>);
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
