import type { Employee } from "./types";

export function fullName(emp: Pick<Employee, "nom" | "prenom">): string {
  return `${emp.nom} ${emp.prenom}`.trim();
}

export const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const EMPLOYEE_COLORS = [
  "#2569f5", "#e0742b", "#16a34a", "#9333ea", "#dc2626", "#0891b2", "#ca8a04",
];

export function employeeColor(index: number): string {
  return EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function isWeekend(dateISO: string): boolean {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function weekdayLetter(dateISO: string): string {
  const letters = ["D", "L", "M", "Me", "J", "V", "S"];
  const d = new Date(dateISO + "T00:00:00Z");
  return letters[d.getUTCDay()];
}

function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysISO(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jours fériés français (fixes + mobiles calculés depuis Pâques). */
export function frenchPublicHolidays(year: number): Set<string> {
  const fixed = [
    `${year}-01-01`, `${year}-05-01`, `${year}-05-08`, `${year}-07-14`,
    `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`,
  ];
  const easter = computeEasterSunday(year);
  const mobile = [addDaysISO(easter, 1), addDaysISO(easter, 39), addDaysISO(easter, 50)];
  return new Set([...fixed, ...mobile]);
}

export function frenchPublicHolidaysList(year: number): { date: string; label: string }[] {
  const easter = computeEasterSunday(year);
  const list = [
    { date: `${year}-01-01`, label: "Jour de l'an" },
    { date: addDaysISO(easter, 1), label: "Lundi de Pâques" },
    { date: `${year}-05-01`, label: "Fête du travail" },
    { date: `${year}-05-08`, label: "Victoire 1945" },
    { date: addDaysISO(easter, 39), label: "Ascension" },
    { date: addDaysISO(easter, 50), label: "Lundi de Pentecôte" },
    { date: `${year}-07-14`, label: "Fête nationale" },
    { date: `${year}-08-15`, label: "Assomption" },
    { date: `${year}-11-01`, label: "Toussaint" },
    { date: `${year}-11-11`, label: "Armistice" },
    { date: `${year}-12-25`, label: "Noël" },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
