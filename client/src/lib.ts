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
