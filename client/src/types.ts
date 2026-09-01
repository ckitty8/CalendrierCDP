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
  date: string;
  value: DayValue;
  category: DayCategory;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  active: boolean;
  forfaitJours: number;
}

export interface Sprint {
  id: string;
  label: string;
  month: number;
  year: number;
  monthLabel: string;
}

export interface TicketType {
  id: string;
  label: string;
  percent: number | null;
  order: number;
  isRemainder: boolean;
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
}

export interface LeaveBalance {
  employeeId: string;
  totalTravaille: number;
  totalConges: number;
  forfaitJours: number;
  ecart: number;
}

export interface OverlapWarning {
  date: string;
  absentEmployees: string[];
  ratio: number;
}

export interface EstimationVariance extends Estimation {
  deltaJH: number;
  overBudget: boolean;
}

export interface DashboardData {
  currentSprintId: string | null;
  leaveBalances: LeaveBalance[];
  overlapWarnings: OverlapWarning[];
  estimationVariances: EstimationVariance[];
  currentSprintCapacity: { employeeId: string; sprintId: string; jours: number }[];
  currentSprintAllocation: { sprintId: string; ticketTypeId: string; jh: number }[];
}

export interface CongesRow {
  employeeId: string;
  month: number;
  travaille: number;
  conges: number;
}

export interface CapacityRow {
  employeeId: string;
  sprintId: string;
  jours: number;
}

export interface AllocationRow {
  sprintId: string;
  ticketTypeId: string;
  jh: number;
}
