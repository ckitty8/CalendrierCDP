import ExcelJS from "exceljs";
import type { AppState, DayEntry, Employee, Estimation, Sprint, SprintTarget, TicketDefRow, TicketType } from "../types.js";
import { readStoreBytes, writeStoreBytes } from "./blobBackend.js";
import seed from "../data/seed.js";

function headerRow(ws: ExcelJS.Worksheet, keys: string[]) {
  ws.addRow(keys);
  ws.getRow(1).font = { bold: true };
}

export async function saveState(state: AppState): Promise<void> {
  const wb = new ExcelJS.Workbook();

  const meta = wb.addWorksheet("Meta");
  meta.addRow(["key", "value"]);
  meta.getRow(1).font = { bold: true };
  meta.addRow(["currentYear", state.meta.currentYear]);
  meta.addRow(["sourceFile", state.meta.sourceFile ?? ""]);

  const emp = wb.addWorksheet("Employees");
  headerRow(emp, ["id", "nom", "prenom", "dateAnniversaire", "role", "active", "forfaitJours"]);
  for (const e of state.employees)
    emp.addRow([e.id, e.nom, e.prenom, e.dateAnniversaire ?? "", e.role, e.active, e.forfaitJours]);

  const days = wb.addWorksheet("Days");
  headerRow(days, ["employeeId", "date", "value", "category"]);
  for (const d of state.days) days.addRow([d.employeeId, d.date, d.value, d.category]);

  const sprints = wb.addWorksheet("Sprints");
  headerRow(sprints, ["id", "label", "month", "year", "monthLabel"]);
  for (const s of state.sprints) sprints.addRow([s.id, s.label, s.month, s.year, s.monthLabel]);

  const tt = wb.addWorksheet("TicketTypes");
  headerRow(tt, ["id", "label", "percent", "order", "isRemainder"]);
  for (const t of state.ticketTypes) tt.addRow([t.id, t.label, t.percent, t.order, t.isRemainder]);

  const defs = wb.addWorksheet("TicketDefs");
  defs.addRow(["group", "type", "criticite", "priorite", "definition"]);
  defs.getRow(1).font = { bold: true };
  const addDefRows = (group: string, rows: TicketDefRow[]) => {
    for (const r of rows) defs.addRow([group, r.type ?? "", r.criticite ?? "", r.priorite ?? "", r.definition ?? ""]);
  };
  addDefRows("us", state.ticketDefs.us);
  addDefRows("bug", state.ticketDefs.bug);
  addDefRows("incident", state.ticketDefs.incident);
  const glpi = wb.addWorksheet("GLPI");
  glpi.addRow(["note"]);
  glpi.addRow([state.ticketDefs.glpi]);

  const targets = wb.addWorksheet("SprintTargets");
  headerRow(targets, ["sprintId", "employeeId", "previsionnelJH"]);
  for (const t of state.sprintTargets) targets.addRow([t.sprintId, t.employeeId, t.previsionnelJH]);

  const est = wb.addWorksheet("Estimations");
  headerRow(est, ["sprintId", "ticketTypeId", "estimatedJH", "spentJH"]);
  for (const e of state.estimations) est.addRow([e.sprintId, e.ticketTypeId, e.estimatedJH, e.spentJH]);

  const buffer = await wb.xlsx.writeBuffer();
  await writeStoreBytes(Buffer.from(buffer));
}

export async function loadState(): Promise<AppState> {
  const bytes = await readStoreBytes();
  if (!bytes) {
    await saveState(seed);
    return seed;
  }

  const wb = new ExcelJS.Workbook();
  // exceljs redéclare globalement `interface Buffer extends ArrayBuffer {}`, ce qui entre en
  // conflit avec le vrai Buffer (Uint8Array) de @types/node — bug de typage connu du package,
  // sans effet à l'exécution (bytes est un Buffer Node standard).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(bytes as any);

  const readRows = (name: string): Record<string, unknown>[] => {
    const ws = wb.getWorksheet(name);
    if (!ws) return [];
    const headers = (ws.getRow(1).values as unknown[]).slice(1).map(String);
    const rows: Record<string, unknown>[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as unknown[]).slice(1);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => (obj[h] = values[i] ?? null));
      rows.push(obj);
    });
    return rows;
  };

  const metaRows = readRows("Meta");
  const metaObj: Record<string, unknown> = {};
  for (const r of metaRows) metaObj[String(r.key)] = r.value;

  const employees = readRows("Employees").map((r) => ({
    id: String(r.id),
    nom: String(r.nom ?? ""),
    prenom: String(r.prenom ?? ""),
    dateAnniversaire: r.dateAnniversaire ? String(r.dateAnniversaire) : null,
    role: String(r.role ?? ""),
    active: Boolean(r.active),
    forfaitJours: Number(r.forfaitJours ?? 218),
  })) as Employee[];

  const days = readRows("Days").map((r) => ({
    employeeId: String(r.employeeId),
    date: String(r.date),
    value: Number(r.value) as 0 | 0.5 | 1,
    category: String(r.category) as DayEntry["category"],
  })) as DayEntry[];

  const sprints = readRows("Sprints").map((r) => ({
    id: String(r.id),
    label: String(r.label),
    month: Number(r.month),
    year: Number(r.year),
    monthLabel: String(r.monthLabel),
  })) as Sprint[];

  const ticketTypes = readRows("TicketTypes").map((r) => ({
    id: String(r.id),
    label: String(r.label),
    percent: r.percent === null || r.percent === "" ? null : Number(r.percent),
    order: Number(r.order),
    isRemainder: Boolean(r.isRemainder),
  })) as TicketType[];

  const defRows = readRows("TicketDefs");
  const toDefRow = (r: Record<string, unknown>): TicketDefRow => ({
    type: String(r.type ?? ""),
    criticite: r.criticite ? String(r.criticite) : null,
    priorite: r.priorite === "" || r.priorite === null ? null : (r.priorite as string | number),
    definition: r.definition ? String(r.definition) : null,
  });
  const glpiRows = readRows("GLPI");

  const sprintTargets = readRows("SprintTargets").map((r) => ({
    sprintId: String(r.sprintId),
    employeeId: String(r.employeeId),
    previsionnelJH: Number(r.previsionnelJH),
  })) as SprintTarget[];

  const estimations = readRows("Estimations").map((r) => ({
    sprintId: String(r.sprintId),
    ticketTypeId: String(r.ticketTypeId),
    estimatedJH: Number(r.estimatedJH),
    spentJH: Number(r.spentJH),
  })) as Estimation[];

  return {
    meta: {
      currentYear: Number(metaObj.currentYear ?? new Date().getFullYear()),
      sourceFile: String(metaObj.sourceFile ?? ""),
    },
    employees,
    days,
    sprints,
    ticketTypes,
    ticketDefs: {
      us: defRows.filter((r) => r.group === "us").map(toDefRow),
      bug: defRows.filter((r) => r.group === "bug").map(toDefRow),
      incident: defRows.filter((r) => r.group === "incident").map(toDefRow),
      glpi: String(glpiRows[0]?.note ?? ""),
    },
    sprintTargets,
    estimations,
  };
}
