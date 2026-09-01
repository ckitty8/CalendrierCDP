import type {
  AppState,
  DayEntry,
  Employee,
  Sprint,
  Estimation,
} from "../types.js";
import { frenchPublicHolidays } from "./holidays.js";

export type CapacityMode = "reel" | "previsionnel";

export function isWeekend(dateISO: string): boolean {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function sprintDateRange(sprint: Sprint): { start: string; end: string } {
  const start = new Date(Date.UTC(sprint.year, sprint.month - 1, 1));
  const end = new Date(Date.UTC(sprint.year, sprint.month, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function joursOuvresCalendaires(
  startISO: string,
  endISO: string,
  holidays: Set<string>
): number {
  let count = 0;
  const d = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  while (d <= end) {
    const day = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidays.has(iso)) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

export function joursTravaillesReel(
  state: AppState,
  employeeId: string,
  startISO: string,
  endISO: string
): number {
  let total = 0;
  for (const d of state.days) {
    if (d.employeeId === employeeId && d.date >= startISO && d.date <= endISO) {
      total += d.value;
    }
  }
  return total;
}

export interface CongesMonthRow {
  employeeId: string;
  month: number;
  travaille: number;
  conges: number;
}

/** Reproduit fidèlement la logique de l'onglet "Jours de congés": une demi-journée
 * compte à la fois pour 0.5j travaillé ET 0.5j de congé (comme dans le fichier source). */
export function congesRollup(state: AppState): CongesMonthRow[] {
  const rows: CongesMonthRow[] = [];
  for (const emp of state.employees) {
    for (let month = 1; month <= 12; month++) {
      let travaille = 0;
      let conges = 0;
      for (const d of state.days) {
        if (d.employeeId !== emp.id) continue;
        const m = Number(d.date.slice(5, 7));
        if (m !== month) continue;
        if (d.value === 1) travaille += 1;
        else if (d.value === 0) conges += 1;
        else if (d.value === 0.5) {
          travaille += 0.5;
          conges += 0.5;
        }
      }
      rows.push({ employeeId: emp.id, month, travaille, conges });
    }
  }
  return rows;
}

export interface LeaveBalance {
  employeeId: string;
  totalTravaille: number;
  totalConges: number;
  forfaitJours: number;
  ecart: number; // totalTravaille - forfaitJours
}

export function leaveBalances(state: AppState): LeaveBalance[] {
  const rollup = congesRollup(state);
  return state.employees.map((emp) => {
    const rows = rollup.filter((r) => r.employeeId === emp.id);
    const totalTravaille = rows.reduce((s, r) => s + r.travaille, 0);
    const totalConges = rows.reduce((s, r) => s + r.conges, 0);
    return {
      employeeId: emp.id,
      totalTravaille,
      totalConges,
      forfaitJours: emp.forfaitJours,
      ecart: totalTravaille - emp.forfaitJours,
    };
  });
}

export interface EmployeeSprintCapacity {
  employeeId: string;
  sprintId: string;
  jours: number;
}

function defaultPrevisionnelForEmployee(state: AppState, emp: Employee): number {
  const sprintCount = state.sprints.length || 12;
  return Math.round((emp.forfaitJours / sprintCount) * 100) / 100;
}

export function employeeSprintCapacity(
  state: AppState,
  mode: CapacityMode
): EmployeeSprintCapacity[] {
  const result: EmployeeSprintCapacity[] = [];
  for (const sprint of state.sprints) {
    const { start, end } = sprintDateRange(sprint);
    for (const emp of state.employees.filter((e) => e.active)) {
      let jours: number;
      if (mode === "reel") {
        jours = joursTravaillesReel(state, emp.id, start, end);
      } else {
        const target = state.sprintTargets.find(
          (t) => t.sprintId === sprint.id && t.employeeId === emp.id
        );
        jours = target ? target.previsionnelJH : defaultPrevisionnelForEmployee(state, emp);
      }
      result.push({ employeeId: emp.id, sprintId: sprint.id, jours });
    }
  }
  return result;
}

export interface SprintAllocationRow {
  sprintId: string;
  ticketTypeId: string;
  jh: number;
}

/** Moteur unique de répartition par type de ticket, paramétré par mode (Réel / Prévisionnel).
 * Dans le fichier source, cette même logique était dupliquée (Feuil1, Capa_Sprint_Réel,
 * Capa_Sprint_prévisionnel) avec un risque de divergence : ici une seule implémentation. */
export function sprintAllocation(state: AppState, mode: CapacityMode): SprintAllocationRow[] {
  const capacities = employeeSprintCapacity(state, mode);
  const bySprintTotal = new Map<string, number>();
  for (const c of capacities) {
    bySprintTotal.set(c.sprintId, (bySprintTotal.get(c.sprintId) || 0) + c.jours);
  }

  const fixed = state.ticketTypes.filter((t) => !t.isRemainder).sort((a, b) => a.order - b.order);
  const remainder = state.ticketTypes.find((t) => t.isRemainder);
  const sumFixedPct = fixed.reduce((s, t) => s + (t.percent || 0), 0);

  const rows: SprintAllocationRow[] = [];
  for (const sprint of state.sprints) {
    const total = bySprintTotal.get(sprint.id) || 0;
    for (const t of fixed) {
      rows.push({ sprintId: sprint.id, ticketTypeId: t.id, jh: total * (t.percent || 0) });
    }
    if (remainder) {
      rows.push({ sprintId: sprint.id, ticketTypeId: remainder.id, jh: total * (1 - sumFixedPct) });
    }
  }
  return rows;
}

export interface OverlapWarning {
  date: string;
  absentEmployees: string[];
  ratio: number;
}

export function leaveOverlapWarnings(state: AppState, thresholdRatio = 0.5): OverlapWarning[] {
  const activeIds = state.employees.filter((e) => e.active).map((e) => e.id);
  if (activeIds.length <= 1) return [];
  const byDate = new Map<string, string[]>();
  for (const d of state.days) {
    if (!activeIds.includes(d.employeeId)) continue;
    if (isWeekend(d.date)) continue;
    if (d.category === "conge_valide" || d.category === "conge_previsionnel") {
      if (!byDate.has(d.date)) byDate.set(d.date, []);
      byDate.get(d.date)!.push(d.employeeId);
    }
  }
  const warnings: OverlapWarning[] = [];
  for (const [date, emps] of byDate) {
    const ratio = emps.length / activeIds.length;
    if (ratio >= thresholdRatio) {
      warnings.push({ date, absentEmployees: emps, ratio });
    }
  }
  return warnings.sort((a, b) => a.date.localeCompare(b.date));
}

export interface EstimationVariance extends Estimation {
  deltaJH: number;
  overBudget: boolean;
}

export function estimationVariances(state: AppState): EstimationVariance[] {
  return state.estimations.map((e) => ({
    ...e,
    deltaJH: e.spentJH - e.estimatedJH,
    overBudget: e.spentJH > e.estimatedJH,
  }));
}

export function currentSprintId(state: AppState, today = new Date()): string | null {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const sprint = state.sprints.find((s) => s.year === year && s.month === month);
  return sprint ? sprint.id : null;
}

export function computedHolidaySet(year: number): Set<string> {
  return new Set(frenchPublicHolidays(year));
}

export function inferDayCategory(dateISO: string, value: number, holidays: Set<string>): string {
  if (value === 1) return "normal";
  if (holidays.has(dateISO)) return "ferie";
  return "conge_valide";
}
