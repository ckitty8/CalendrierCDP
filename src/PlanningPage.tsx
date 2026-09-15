import { useEffect, useMemo, useState } from "react";
import type { DayCategory, DayEntry, DayValue } from "./types";
import {
  MONTH_LABELS,
  daysInMonth,
  frenchPublicHolidaysList,
  fullName,
  isWeekend,
  isoDate,
  weekdayLetter,
  weekOfYear,
} from "./lib";
import type { PlanningState } from "./usePlanningState";
import { exportMonthToExcel } from "./exportExcel";
import CongesPage from "./CongesPage";

const CATEGORY_META: { key: DayCategory; label: string; color: string }[] = [
  { key: "normal", label: "Présence", color: "var(--card)" },
  { key: "ferie", label: "Jour férié", color: "var(--ferie)" },
  { key: "fermeture", label: "Fermeture", color: "var(--fermeture)" },
  { key: "absent_projet", label: "Absent (hors équipe)", color: "var(--absent-projet)" },
  { key: "conge_previsionnel", label: "Congé prévisionnel", color: "var(--conge-prev)" },
  { key: "conge_valide", label: "Congé validé", color: "var(--conge-valide)" },
];

const CATEGORY_COLOR: Record<DayCategory, string> = Object.fromEntries(
  CATEGORY_META.map((c) => [c.key, c.color])
) as Record<DayCategory, string>;

const today = new Date();

function cellKey(employeeId: string, date: string): string {
  return `${employeeId}|${date}`;
}

interface PlanningPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
}

export default function PlanningPage({ state, setState }: PlanningPageProps) {
  const [month, setMonth] = useState(() =>
    today.getFullYear() === state.year ? today.getMonth() + 1 : 1
  );
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showConges, setShowConges] = useState(true);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<{ row: number; col: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [draftDays, setDraftDays] = useState<DayEntry[]>(state.days);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!dirty) setDraftDays(state.days);
  }, [state.days, dirty]);

  useEffect(() => {
    if (!state.projects.some((p) => p.id === projectFilter)) {
      setProjectFilter(state.projects[0]?.id ?? "");
    }
  }, [state.projects, projectFilter]);

  const employees = useMemo(
    () =>
      state.employees.filter((e) => (e.active || showInactive) && (!projectFilter || e.projectIds.includes(projectFilter))),
    [state.employees, showInactive, projectFilter]
  );

  const nDays = daysInMonth(state.year, month);
  const days = useMemo(() => Array.from({ length: nDays }, (_, i) => i + 1), [nDays]);

  const weekGroups = useMemo(() => {
    const groups: { week: number; span: number }[] = [];
    for (const day of days) {
      const week = weekOfYear(isoDate(state.year, month, day));
      const last = groups[groups.length - 1];
      if (last && last.week === week) last.span += 1;
      else groups.push({ week, span: 1 });
    }
    return groups;
  }, [days, state.year, month]);

  const dayIndex = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const d of draftDays) m.set(cellKey(d.employeeId, d.date), d);
    return m;
  }, [draftDays]);

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
    setDraftDays((prevDays) => {
      const newDays = [...prevDays];
      const idx = new Map<string, number>();
      newDays.forEach((d, i) => idx.set(cellKey(d.employeeId, d.date), i));
      for (const key of selection) {
        const [employeeId, date] = key.split("|");
        const entry: DayEntry = { employeeId, date, category, value };
        const i = idx.get(key);
        if (i !== undefined) newDays[i] = entry;
        else newDays.push(entry);
      }
      return newDays;
    });
    setDirty(true);
  }

  function fillMonthPresence() {
    setDraftDays((prevDays) => {
      const newDays = [...prevDays];
      const idx = new Map<string, number>();
      newDays.forEach((d, i) => idx.set(cellKey(d.employeeId, d.date), i));
      for (const emp of employees) {
        for (const day of days) {
          const date = isoDate(state.year, month, day);
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
      return newDays;
    });
    setDirty(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportMonthToExcel(state.year, month, employees, draftDays);
    } finally {
      setExporting(false);
    }
  }

  function saveDays() {
    setState((prev) => ({ ...prev, days: draftDays }));
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function resetData() {
    if (!confirm("Réinitialiser toutes les données au planning d'origine ?")) return;
    localStorage.removeItem("calendriercdp-planning-v1");
    window.location.reload();
  }

  const selectedCount = selection.size;

  return (
    <div>
      {state.projects.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
          {state.projects.map((p) => {
            const active = p.id === projectFilter;
            return (
              <button
                key={p.id}
                onClick={() => setProjectFilter(p.id)}
                style={{
                  padding: "10px 18px",
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                  background: "none",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  cursor: "pointer",
                  marginBottom: -1,
                  whiteSpace: "nowrap",
                }}
              >
                {p.nom}
              </button>
            );
          })}
        </div>
      )}

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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Planning {state.year}
            {projectFilter && ` — ${state.projects.find((p) => p.id === projectFilter)?.nom ?? ""}`}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            Clic : sélection simple · Ctrl/Cmd+clic : ajouter/retirer · Maj+clic : sélection rectangulaire
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className={dirty ? "btn-primary" : "btn-ghost"}
            onClick={saveDays}
            disabled={!dirty}
          >
            {savedFlash ? "Enregistré ✓" : "Enregistrer"}
          </button>
          <button className="btn-ghost" onClick={resetData}>
            Réinitialiser les données
          </button>
        </div>
      </header>

      {state.projects.length === 0 ? (
        <div className="panel">
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
            Aucune équipe pour le moment — créez-en une dans la page Administration pour afficher son planning.
          </p>
        </div>
      ) : (
      <div className="layout-grid">
        <aside className="planning-sidebar" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
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
                      border: "1px solid var(--border)",
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
                  <li key={h.date} style={{ fontSize: 12.5, color: "var(--muted-foreground)", display: "flex", justifyContent: "space-between" }}>
                    <span>{h.label}</span>
                    <span style={{ textTransform: "capitalize" }}>
                      {new Date(h.date + "T00:00:00Z").toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "14px 18px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Planning</h2>
            </div>
            <div style={{ padding: 16 }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MONTH_LABELS.map((label, i) => {
                const m = i + 1;
                const active = m === month;
                return (
                  <button
                    key={label}
                    onClick={() => setMonth(m)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: "var(--radius)",
                      border: active ? "1px solid var(--primary)" : "1px solid var(--input)",
                      background: active ? "var(--primary)" : "var(--card)",
                      color: active ? "var(--primary-foreground)" : "var(--foreground)",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="panel" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
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
                    border: "1px solid var(--border)",
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
                  title="Remet en Présence avec cette valeur (efface toute catégorie spéciale)"
                  onClick={() => applyToSelection("normal", v)}
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

          <div style={{ overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)", maxHeight: "70vh", paddingBottom: 20 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky-col sticky-row col-name"
                    style={{ textAlign: "left", padding: "6px 10px", top: 0 }}
                  >
                    Collaborateur
                  </th>
                  {weekGroups.map((g, i) => (
                    <th
                      key={i}
                      colSpan={g.span}
                      className="sticky-row"
                      style={{ top: 0, padding: "3px 2px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--muted)" }}
                    >
                      Sem {g.week}
                    </th>
                  ))}
                </tr>
                <tr>
                  {days.map((day) => {
                    const date = isoDate(state.year, month, day);
                    const weekend = isWeekend(date);
                    const holiday = holidaySet.has(date);
                    return (
                      <th
                        key={day}
                        className="sticky-row"
                        style={{
                          minWidth: 30,
                          padding: "4px 2px",
                          top: 24,
                          background: weekend ? "var(--muted)" : "var(--card)",
                          color: holiday ? "var(--ferie)" : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{day}</div>
                        <div style={{ fontWeight: 400, color: holiday ? "var(--ferie)" : "var(--muted-foreground)" }}>{weekdayLetter(date)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, row) => (
                  <tr key={emp.id}>
                    <td className="sticky-col col-name" style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap", opacity: emp.active ? 1 : 0.5 }}>
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
                      const bg = weekend ? "var(--muted)" : entry ? CATEGORY_COLOR[entry.category] : "var(--card)";
                      return (
                        <td
                          key={day}
                          onClick={(e) => handleCellClick(row, col, e)}
                          style={{
                            textAlign: "center",
                            padding: "6px 2px",
                            background: bg,
                            cursor: "pointer",
                            outline: selected ? "2px solid var(--ring)" : "1px solid var(--border)",
                            outlineOffset: -1,
                            userSelect: "none",
                            fontFamily: "var(--font-mono)",
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
            </div>
          </div>

          <div className="panel" style={{ marginTop: 48, padding: 0, overflow: "hidden" }}>
            <button
              onClick={() => setShowConges((s) => !s)}
              style={{
                background: "none",
                color: "var(--foreground)",
                border: "none",
                borderBottom: "1px solid var(--border)",
                padding: "14px 18px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Résumé des congés</h2>
              <span style={{ fontSize: 18, lineHeight: 1, color: "var(--muted-foreground)" }}>{showConges ? "−" : "+"}</span>
            </button>
            {showConges && (
              <div style={{ padding: 16 }}>
                <CongesPage state={state} setState={setState} embedded projectId={projectFilter || undefined} />
              </div>
            )}
          </div>
        </main>
      </div>
      )}
    </div>
  );
}
