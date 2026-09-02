import { useMemo, useState } from "react";
import type { DayCategory, DayEntry, DayValue } from "./types";
import {
  MONTH_LABELS,
  daysInMonth,
  frenchPublicHolidaysList,
  fullName,
  isWeekend,
  isoDate,
  weekdayLetter,
} from "./lib";
import { usePlanningState } from "./usePlanningState";
import { exportMonthToExcel } from "./exportExcel";

const CATEGORY_META: { key: DayCategory; label: string; color: string }[] = [
  { key: "normal", label: "Présence", color: "#ffffff" },
  { key: "ferie", label: "Jour férié", color: "#c65911" },
  { key: "fermeture", label: "Fermeture", color: "#806000" },
  { key: "absent_projet", label: "Absent (hors projet)", color: "#7b7b7b" },
  { key: "conge_previsionnel", label: "Congé prévisionnel", color: "#ffc000" },
  { key: "conge_valide", label: "Congé validé", color: "#a9d08e" },
];

const CATEGORY_COLOR: Record<DayCategory, string> = Object.fromEntries(
  CATEGORY_META.map((c) => [c.key, c.color])
) as Record<DayCategory, string>;

const today = new Date();

function cellKey(employeeId: string, date: string): string {
  return `${employeeId}|${date}`;
}

export default function App() {
  const [state, setState] = usePlanningState();
  const [month, setMonth] = useState(() =>
    today.getFullYear() === state.year ? today.getMonth() + 1 : 1
  );
  const [showInactive, setShowInactive] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  const employees = useMemo(
    () => state.employees.filter((e) => e.active || showInactive),
    [state.employees, showInactive]
  );

  const nDays = daysInMonth(state.year, month);
  const days = useMemo(() => Array.from({ length: nDays }, (_, i) => i + 1), [nDays]);

  const dayIndex = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const d of state.days) m.set(cellKey(d.employeeId, d.date), d);
    return m;
  }, [state.days]);

  const holidays = useMemo(() => frenchPublicHolidaysList(state.year), [state.year]);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  function handleCellClick(row: number, col: number, event: React.MouseEvent) {
    const emp = employees[row];
    const date = isoDate(state.year, month, days[col]);
    const key = cellKey(emp.id, date);

    if (event.shiftKey && anchor) {
      const rowMin = Math.min(anchor.row, row);
      const rowMax = Math.max(anchor.row, row);
      const colMin = Math.min(anchor.col, col);
      const colMax = Math.max(anchor.col, col);
      const next = new Set<string>();
      for (let r = rowMin; r <= rowMax; r++) {
        for (let c = colMin; c <= colMax; c++) {
          next.add(cellKey(employees[r].id, isoDate(state.year, month, days[c])));
        }
      }
      setSelection(next);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setAnchor({ row, col });
      return;
    }

    setSelection(new Set([key]));
    setAnchor({ row, col });
  }

  function applyToSelection(category: DayCategory, value: DayValue) {
    if (selection.size === 0) return;
    setState((prev) => {
      const newDays = [...prev.days];
      const idx = new Map<string, number>();
      newDays.forEach((d, i) => idx.set(cellKey(d.employeeId, d.date), i));
      for (const key of selection) {
        const [employeeId, date] = key.split("|");
        const entry: DayEntry = { employeeId, date, category, value };
        const i = idx.get(key);
        if (i !== undefined) newDays[i] = entry;
        else newDays.push(entry);
      }
      return { ...prev, days: newDays };
    });
  }

  function selectionCategory(): DayCategory {
    if (selection.size === 0) return "normal";
    const firstKey = selection.values().next().value as string;
    return dayIndex.get(firstKey)?.category ?? "normal";
  }

  function fillMonthPresence() {
    setState((prev) => {
      const newDays = [...prev.days];
      const idx = new Map<string, number>();
      newDays.forEach((d, i) => idx.set(cellKey(d.employeeId, d.date), i));
      for (const emp of employees) {
        for (const day of days) {
          const date = isoDate(prev.year, month, day);
          if (isWeekend(date) || holidaySet.has(date)) continue;
          const key = cellKey(emp.id, date);
          const i = idx.get(key);
          const existing = i !== undefined ? newDays[i] : undefined;
          if (!existing || existing.category === "normal") {
            const entry: DayEntry = { employeeId: emp.id, date, category: "normal", value: 1 };
            if (i !== undefined) newDays[i] = entry;
            else newDays.push(entry);
          }
        }
      }
      return { ...prev, days: newDays };
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportMonthToExcel(state.year, month, employees, state.days);
    } finally {
      setExporting(false);
    }
  }

  function resetData() {
    if (!confirm("Réinitialiser toutes les données au planning d'origine ?")) return;
    localStorage.removeItem("calendriercdp-planning-v1");
    window.location.reload();
  }

  const selectedCount = selection.size;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px 60px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Planning {state.year}</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Clic : sélection simple · Ctrl/Cmd+clic : ajouter/retirer · Maj+clic : sélection rectangulaire
          </p>
        </div>
        <button className="btn-ghost" onClick={resetData}>
          Réinitialiser les données
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, alignItems: "start" }}>
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <h2 className="panel-title">Export</h2>
            <button className="btn-primary" onClick={handleExport} disabled={exporting} style={{ width: "100%" }}>
              {exporting ? "Génération…" : `Télécharger ${MONTH_LABELS[month - 1]} en Excel`}
            </button>
          </div>

          <div className="panel">
            <h2 className="panel-title">Actions</h2>
            <button className="btn-secondary" style={{ width: "100%", marginBottom: 10 }} onClick={fillMonthPresence}>
              Remplir {MONTH_LABELS[month - 1]} en Présence
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Afficher les collaborateurs inactifs
            </label>
          </div>

          <div className="panel">
            <h2 className="panel-title">Légende</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {CATEGORY_META.map((c) => (
                <li key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: c.color,
                      border: "1px solid #d0d5dd",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <button
              className="panel-title"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
              onClick={() => setShowHolidays((s) => !s)}
            >
              <span>Jours fériés {state.year}</span>
              <span>{showHolidays ? "−" : "+"}</span>
            </button>
            {showHolidays && (
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {holidays.map((h) => (
                  <li key={h.date} style={{ fontSize: 12.5, color: "#475569", display: "flex", justifyContent: "space-between" }}>
                    <span>{h.label}</span>
                    <span>
                      {new Date(h.date + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn-ghost" onClick={() => setMonth((m) => Math.max(1, m - 1))} disabled={month === 1}>
                ←
              </button>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="select">
                {MONTH_LABELS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <button className="btn-ghost" onClick={() => setMonth((m) => Math.min(12, m + 1))} disabled={month === 12}>
                →
              </button>
            </div>

            <div className="panel" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "#475569", minWidth: 150 }}>
                {selectedCount === 0
                  ? "Aucune cellule sélectionnée"
                  : `${selectedCount} cellule${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}`}
              </span>
              {CATEGORY_META.map((c) => (
                <button
                  key={c.key}
                  title={c.label}
                  disabled={selectedCount === 0}
                  onClick={() => applyToSelection(c.key, c.key === "normal" ? 1 : 0)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    background: c.color,
                    border: "1px solid #94a3b8",
                    cursor: selectedCount === 0 ? "default" : "pointer",
                    opacity: selectedCount === 0 ? 0.4 : 1,
                  }}
                />
              ))}
              {([0, 0.5, 1] as DayValue[]).map((v) => (
                <button
                  key={v}
                  className="btn-ghost"
                  style={{ padding: "2px 8px", fontSize: 12 }}
                  disabled={selectedCount === 0}
                  onClick={() => applyToSelection(selectionCategory(), v)}
                >
                  {v}
                </button>
              ))}
              <button
                className="btn-ghost"
                style={{ padding: "2px 8px", fontSize: 12 }}
                disabled={selectedCount === 0}
                onClick={() => setSelection(new Set())}
              >
                Fermer
              </button>
            </div>
          </div>

          <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", maxHeight: "70vh" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th className="sticky-col sticky-row" style={{ minWidth: 170, textAlign: "left", padding: "6px 10px" }}>
                    Collaborateur
                  </th>
                  {days.map((day) => {
                    const date = isoDate(state.year, month, day);
                    const weekend = isWeekend(date);
                    const holiday = holidaySet.has(date);
                    return (
                      <th
                        key={day}
                        className="sticky-row"
                        style={{ minWidth: 30, padding: "4px 2px", background: weekend ? "#f1f5f9" : holiday ? "#fdf2e9" : "#fff" }}
                      >
                        <div style={{ fontWeight: 700 }}>{day}</div>
                        <div style={{ fontWeight: 400, color: "#94a3b8" }}>{weekdayLetter(date)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, row) => (
                  <tr key={emp.id}>
                    <td className="sticky-col" style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap", opacity: emp.active ? 1 : 0.5 }}>
                      {fullName(emp)}
                    </td>
                    {days.map((day, col) => {
                      const date = isoDate(state.year, month, day);
                      const key = cellKey(emp.id, date);
                      const weekend = isWeekend(date);
                      const entry =
                        dayIndex.get(key) ??
                        (!weekend
                          ? holidaySet.has(date)
                            ? ({ employeeId: emp.id, date, category: "ferie", value: 0 } as DayEntry)
                            : ({ employeeId: emp.id, date, category: "normal", value: 1 } as DayEntry)
                          : undefined);
                      const selected = selection.has(key);
                      const bg = weekend ? "#f1f5f9" : entry ? CATEGORY_COLOR[entry.category] : "#fff";
                      return (
                        <td
                          key={day}
                          onClick={(e) => handleCellClick(row, col, e)}
                          style={{
                            textAlign: "center",
                            padding: "6px 2px",
                            background: bg,
                            cursor: "pointer",
                            outline: selected ? "2px solid #2569f5" : "1px solid #f1f5f9",
                            outlineOffset: -1,
                            userSelect: "none",
                          }}
                        >
                          {entry ? entry.value : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
