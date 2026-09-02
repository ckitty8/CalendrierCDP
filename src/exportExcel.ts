import ExcelJS from "exceljs";
import type { DayEntry, Employee } from "./types";
import { MONTH_LABELS, daysInMonth, frenchPublicHolidays, fullName, isWeekend, isoDate, weekdayLetter } from "./lib";

const CATEGORY_COLORS: Record<string, string> = {
  ferie: "FFC65911",
  fermeture: "FF806000",
  absent_projet: "FF7B7B7B",
  conge_previsionnel: "FFFFC000",
  conge_valide: "FFA9D08E",
};

const WEEKEND_FILL = "FFF1F5F9";

export async function exportMonthToExcel(
  year: number,
  month: number,
  employees: Employee[],
  days: DayEntry[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CalendrierCDP";
  wb.created = new Date();
  const ws = wb.addWorksheet(`${MONTH_LABELS[month - 1]} ${year}`);

  const n = daysInMonth(year, month);
  const holidays = frenchPublicHolidays(year);

  ws.getCell(1, 1).value = "Employé";
  ws.getCell(1, 1).font = { bold: true };
  ws.getCell(2, 1).value = "";

  for (let day = 1; day <= n; day++) {
    const d = isoDate(year, month, day);
    const col = 1 + day;
    const c1 = ws.getCell(1, col);
    c1.value = day;
    c1.font = { bold: true };
    c1.alignment = { horizontal: "center" };
    const c2 = ws.getCell(2, col);
    c2.value = weekdayLetter(d);
    c2.alignment = { horizontal: "center" };
    if (isWeekend(d)) {
      const fill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: WEEKEND_FILL } };
      c1.fill = fill;
      c2.fill = fill;
    }
  }

  const dayIndex = new Map<string, DayEntry>();
  for (const d of days) dayIndex.set(`${d.employeeId}|${d.date}`, d);

  employees.forEach((emp, i) => {
    const row = 3 + i;
    const nameCell = ws.getCell(row, 1);
    nameCell.value = fullName(emp);
    nameCell.font = { bold: true };
    for (let day = 1; day <= n; day++) {
      const d = isoDate(year, month, day);
      const col = 1 + day;
      const cell = ws.getCell(row, col);
      cell.alignment = { horizontal: "center" };
      if (isWeekend(d)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WEEKEND_FILL } };
        continue;
      }
      const entry = dayIndex.get(`${emp.id}|${d}`) ?? (holidays.has(d) ? { employeeId: emp.id, date: d, value: 0, category: "ferie" as const } : undefined);
      if (entry) {
        cell.value = entry.value;
        const fill = CATEGORY_COLORS[entry.category];
        if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
      }
    }
  });

  ws.getColumn(1).width = 22;
  for (let day = 1; day <= n; day++) ws.getColumn(1 + day).width = 4;
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Planning_${MONTH_LABELS[month - 1]}_${year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
