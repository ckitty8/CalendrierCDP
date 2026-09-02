import type { Employee } from "./types";

export function fullName(emp: Pick<Employee, "nom" | "prenom">): string {
  return `${emp.nom} ${emp.prenom}`.trim();
}

/** Prochains anniversaires (mois/jour uniquement, l'année de dateAnniversaire est ignorée),
 * triés par proximité dans les `withinDays` prochains jours (par défaut 30). */
export function upcomingBirthdays(
  employees: Employee[],
  today = new Date(),
  withinDays = 30
): { employee: Employee; daysUntil: number }[] {
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const results: { employee: Employee; daysUntil: number }[] = [];
  for (const emp of employees) {
    if (!emp.dateAnniversaire) continue;
    const d = new Date(emp.dateAnniversaire + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) continue;
    for (const yearOffset of [0, 1]) {
      const next = Date.UTC(today.getUTCFullYear() + yearOffset, d.getUTCMonth(), d.getUTCDate());
      const daysUntil = Math.round((next - todayUTC) / 86400000);
      if (daysUntil >= 0 && daysUntil <= withinDays) {
        results.push({ employee: emp, daysUntil });
        break;
      }
    }
  }
  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatBirthday(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
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

export function formatJH(n: number): string {
  return (Math.round(n * 100) / 100).toLocaleString("fr-FR");
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

/** Jours fériés français (fixes + mobiles), même algorithme que côté serveur. */
export function frenchPublicHolidays(year: number): Set<string> {
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const fixed = [
    `${year}-01-01`, `${year}-05-01`, `${year}-05-08`, `${year}-07-14`,
    `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`,
  ];
  const easter = computeEasterSunday(year);
  const mobile = [addDays(easter, 1), addDays(easter, 39), addDays(easter, 50)];
  return new Set([...fixed, ...mobile]);
}

/** Nombre de jours ouvrés (lun-ven) d'un mois. */
export function joursOuvresDuMois(year: number, month: number): number {
  const n = daysInMonth(year, month);
  let count = 0;
  for (let day = 1; day <= n; day++) {
    if (!isWeekend(isoDate(year, month, day))) count++;
  }
  return count;
}

/** Nombre de jours ouvrés d'un mois hors jours fériés français. */
export function joursOuvresHorsFeries(year: number, month: number, holidays: Set<string>): number {
  const n = daysInMonth(year, month);
  let count = 0;
  for (let day = 1; day <= n; day++) {
    const d = isoDate(year, month, day);
    if (!isWeekend(d) && !holidays.has(d)) count++;
  }
  return count;
}
