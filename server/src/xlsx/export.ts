import ExcelJS from "exceljs";
import type { AppState } from "../types.js";
import {
  congesRollup,
  employeeSprintCapacity,
  fullName,
  leaveBalances,
  sprintAllocation,
} from "../calc/engine.js";

const CATEGORY_COLORS: Record<string, string> = {
  ferie: "FFC65911",
  fermeture: "FF806000",
  absent_projet: "FF7B7B7B",
  conge_previsionnel: "FFFFC000",
  conge_valide: "FFA9D08E",
};

const WEEKDAY_LETTERS = ["D", "L", "M", "Me", "J", "V", "S"];
const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function isoDaysOfYear(year: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCFullYear() === year) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function buildPlanningSheet(wb: ExcelJS.Workbook, state: AppState) {
  const year = state.meta.currentYear;
  const ws = wb.addWorksheet(`Planning ${year}`);
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

  // Legend
  ws.getCell("A1").value = "Légende";
  ws.getCell("A1").font = { bold: true };
  const legendLabels: [string, string][] = [
    ["Férié", "ferie"],
    ["Fermeture entreprise", "fermeture"],
    ["Absent du projet", "absent_projet"],
    ["Congé prévisionnel", "conge_previsionnel"],
    ["Congé validé", "conge_valide"],
  ];
  legendLabels.forEach(([label, cat], i) => {
    const cell = ws.getCell(2 + i, 1);
    cell.value = label;
    const fill = CATEGORY_COLORS[cat];
    if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  });

  const days = isoDaysOfYear(year);
  const headerRow = 9;
  ws.getCell(headerRow, 1).value = "Employé";
  ws.getCell(headerRow, 1).font = { bold: true };
  days.forEach((iso, i) => {
    const col = 2 + i;
    const date = new Date(iso + "T00:00:00Z");
    const c1 = ws.getCell(headerRow, col);
    c1.value = date;
    c1.numFmt = "dd/mm";
    const c2 = ws.getCell(headerRow + 1, col);
    c2.value = WEEKDAY_LETTERS[date.getUTCDay()];
  });
  const totalCol = 2 + days.length;
  ws.getCell(headerRow, totalCol).value = "Total travaillé (j)";
  ws.getCell(headerRow, totalCol).font = { bold: true };

  const dayIndex = new Map<string, { value: number; category: string }>();
  for (const d of state.days) dayIndex.set(`${d.employeeId}|${d.date}`, { value: d.value, category: d.category });

  state.employees.forEach((emp, r) => {
    const row = headerRow + 2 + r;
    ws.getCell(row, 1).value = fullName(emp);
    days.forEach((iso, i) => {
      const col = 2 + i;
      const entry = dayIndex.get(`${emp.id}|${iso}`);
      const cell = ws.getCell(row, col);
      if (entry) {
        cell.value = entry.value;
        const fill = CATEGORY_COLORS[entry.category];
        if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
    });
    const startCol = ws.getColumn(2).letter;
    const endCol = ws.getColumn(1 + days.length).letter;
    ws.getCell(row, totalCol).value = { formula: `SUM(${startCol}${row}:${endCol}${row})` };
  });

  ws.getColumn(1).width = 22;
  return ws;
}

function buildCongesSheet(wb: ExcelJS.Workbook, state: AppState) {
  const ws = wb.addWorksheet("Congés");
  const rollup = congesRollup(state);
  const balances = leaveBalances(state);

  ws.addRow(["Employé", ...MONTH_LABELS.flatMap((m) => [`${m} - Travaillé`, `${m} - Congés`]), "Total travaillé", "Total congés", "Forfait (j)", "Écart"]);
  ws.getRow(1).font = { bold: true };

  for (const emp of state.employees) {
    const row: (string | number)[] = [fullName(emp)];
    for (let month = 1; month <= 12; month++) {
      const r = rollup.find((x) => x.employeeId === emp.id && x.month === month);
      row.push(r?.travaille ?? 0, r?.conges ?? 0);
    }
    const bal = balances.find((b) => b.employeeId === emp.id)!;
    row.push(bal.totalTravaille, bal.totalConges, bal.forfaitJours, bal.ecart);
    ws.addRow(row);
  }
  ws.getColumn(1).width = 22;
  return ws;
}

function buildCapaciteSheet(wb: ExcelJS.Workbook, state: AppState, mode: "reel" | "previsionnel", title: string) {
  const ws = wb.addWorksheet(title);
  const capacities = employeeSprintCapacity(state, mode);
  const allocation = sprintAllocation(state, mode);

  ws.addRow(["Employé", ...state.sprints.map((s) => s.label), "Total"]);
  ws.getRow(1).font = { bold: true };
  for (const emp of state.employees.filter((e) => e.active)) {
    const row: (string | number)[] = [fullName(emp)];
    let total = 0;
    for (const sprint of state.sprints) {
      const c = capacities.find((x) => x.employeeId === emp.id && x.sprintId === sprint.id);
      const j = c?.jours ?? 0;
      row.push(Math.round(j * 100) / 100);
      total += j;
    }
    row.push(Math.round(total * 100) / 100);
    ws.addRow(row);
  }

  ws.addRow([]);
  ws.addRow(["Répartition par type de ticket (JH)"]).font = { bold: true };
  ws.addRow(["Type", ...state.sprints.map((s) => s.label), "Total"]);
  ws.getRow(ws.rowCount).font = { bold: true };
  for (const t of state.ticketTypes.sort((a, b) => a.order - b.order)) {
    const row: (string | number)[] = [t.label];
    let total = 0;
    for (const sprint of state.sprints) {
      const a = allocation.find((x) => x.ticketTypeId === t.id && x.sprintId === sprint.id);
      const jh = a?.jh ?? 0;
      row.push(Math.round(jh * 100) / 100);
      total += jh;
    }
    row.push(Math.round(total * 100) / 100);
    ws.addRow(row);
  }
  ws.getColumn(1).width = 24;
  return ws;
}

function buildDefinitionSheet(wb: ExcelJS.Workbook, state: AppState) {
  const ws = wb.addWorksheet("Définition_typeTicket");
  ws.addRow(["US — Priorité demandeur / Complexité"]).font = { bold: true };
  ws.addRow(["Type", "Criticité", "Priorité"]);
  ws.getRow(ws.rowCount).font = { bold: true };
  for (const r of state.ticketDefs.us) ws.addRow([r.type, r.criticite, r.priorite]);

  ws.addRow([]);
  ws.addRow(["Bug — Criticité / Priorité / Définition"]).font = { bold: true };
  ws.addRow(["Type", "Criticité", "Priorité", "Définition"]);
  ws.getRow(ws.rowCount).font = { bold: true };
  for (const r of state.ticketDefs.bug) ws.addRow([r.type, r.criticite, r.priorite, r.definition]);

  ws.addRow([]);
  ws.addRow(["Incident — Criticité / Priorité / Définition"]).font = { bold: true };
  ws.addRow(["Type", "Criticité", "Priorité", "Définition"]);
  ws.getRow(ws.rowCount).font = { bold: true };
  for (const r of state.ticketDefs.incident) ws.addRow([r.type, r.criticite, r.priorite, r.definition]);

  ws.addRow([]);
  ws.addRow(["GLPI", state.ticketDefs.glpi]);
  ws.getColumn(1).width = 14;
  ws.getColumn(4).width = 60;
  return ws;
}

function buildEquipeSheet(wb: ExcelJS.Workbook, state: AppState) {
  const ws = wb.addWorksheet("Équipe");
  ws.addRow(["Nom", "Prénom", "Date d'anniversaire", "Rôle", "Actif", "Forfait annuel (j)"]);
  ws.getRow(1).font = { bold: true };
  for (const e of state.employees)
    ws.addRow([e.nom, e.prenom, e.dateAnniversaire ?? "", e.role, e.active ? "Oui" : "Non", e.forfaitJours]);
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 18;
  return ws;
}

export async function buildExportWorkbook(state: AppState): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CalendrierCDP";
  wb.created = new Date();
  buildEquipeSheet(wb, state);
  buildPlanningSheet(wb, state);
  buildCongesSheet(wb, state);
  buildCapaciteSheet(wb, state, "reel", "Capa_Sprint_Réel");
  buildCapaciteSheet(wb, state, "previsionnel", "Capa_Sprint_Prévisionnel");
  buildDefinitionSheet(wb, state);
  return wb;
}
