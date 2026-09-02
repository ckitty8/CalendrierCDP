export type DayValue = 0 | 0.5 | 1;

export type DayCategory =
  | "normal"
  | "ferie"
  | "fermeture"
  | "absent_projet"
  | "conge_previsionnel"
  | "conge_valide";

export interface DayEntry {
  employeeId: string;
  date: string; // ISO yyyy-mm-dd
  value: DayValue;
  category: DayCategory;
}

export interface Employee {
  id: string;
  nom: string;
  prenom: string;
  dateAnniversaire: string | null; // ISO yyyy-mm-dd, optionnel
  role: string;
  active: boolean;
  forfaitJours: number; // reference annual working-day budget (default 218)
}

export interface Sprint {
  id: string;
  label: string;
  month: number; // 1-12
  year: number;
  monthLabel: string;
}

export interface TicketType {
  id: string;
  label: string;
  percent: number | null; // fraction, e.g. 0.2. null when isRemainder
  order: number;
  isRemainder: boolean; // true for "US" = 100% - sum(others)
}

export interface TicketDefRow {
  type?: string;
  criticite?: string | null;
  priorite?: number | string | null;
  definition?: string | null;
}

export interface TicketDefs {
  us: TicketDefRow[];
  bug: TicketDefRow[];
  incident: TicketDefRow[];
  glpi: string;
}

export interface SprintTarget {
  sprintId: string;
  employeeId: string;
  previsionnelJH: number;
}

export interface Estimation {
  sprintId: string;
  ticketTypeId: string;
  estimatedJH: number;
  spentJH: number;
}

export interface AppState {
  meta: { currentYear: number; sourceFile?: string };
  employees: Employee[];
  days: DayEntry[];
  sprints: Sprint[];
  ticketTypes: TicketType[];
  ticketDefs: TicketDefs;
  sprintTargets: SprintTarget[];
  estimations: Estimation[];
  publicHolidays?: string[]; // computed cache, ISO dates
}
