import { useEffect, useMemo, useState } from "react";
import type { DayEntry, TimeEntry } from "./types";
import { fullName, uniqueId, weekDates, weekOfYear, weekdayLetter } from "./lib";
import type { PlanningState } from "./usePlanningState";

interface TimeTrackingPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatDateFR(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function entryKey(date: string, projectId: string): string {
  return `${date}__${projectId}`;
}

export default function TimeTrackingPage({ state, setState }: TimeTrackingPageProps) {
  const employees = useMemo(() => state.employees.filter((e) => e.active), [state.employees]);

  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [anchorDate, setAnchorDate] = useState<string>(todayISO());
  const [draftHeures, setDraftHeures] = useState<Record<string, number>>({});
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!employeeId && employees.length > 0) setEmployeeId(employees[0].id);
  }, [employees, employeeId]);

  const employee = employees.find((e) => e.id === employeeId);
  const myProjects = useMemo(
    () => (employee ? state.projects.filter((p) => employee.projectIds.includes(p.id)) : []),
    [employee, state.projects]
  );

  const dayIndex = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const d of state.days) m.set(`${d.employeeId}|${d.date}`, d);
    return m;
  }, [state.days]);

  const week = weekOfYear(anchorDate);
  const days = useMemo(() => weekDates(anchorDate), [anchorDate]);

  // Pré-remplit le formulaire avec les saisies existantes pour ce collaborateur/cette semaine.
  useEffect(() => {
    const existing: Record<string, number> = {};
    for (const t of state.timeEntries) {
      if (t.employeeId === employeeId && days.includes(t.date)) existing[entryKey(t.date, t.projectId)] = t.heures;
    }
    setDraftHeures(existing);
  }, [employeeId, days, state.timeEntries]);

  function editHeures(date: string, projectId: string, value: number) {
    setDraftHeures((prev) => ({ ...prev, [entryKey(date, projectId)]: value }));
  }

  function totalJourSaisi(date: string): number {
    return myProjects.reduce((s, p) => s + (draftHeures[entryKey(date, p.id)] ?? 0), 0);
  }

  function totalProjetSaisi(projectId: string): number {
    return days.reduce((s, d) => s + (draftHeures[entryKey(d, projectId)] ?? 0), 0);
  }

  function saveWeek() {
    if (!employeeId) return;
    const daySet = new Set(days);
    const added: TimeEntry[] = [];
    for (const d of days) {
      for (const p of myProjects) {
        const h = draftHeures[entryKey(d, p.id)] ?? 0;
        if (h > 0) added.push({ id: uniqueId(`${employeeId}-${d}-${p.id}`, [], "temps"), employeeId, projectId: p.id, date: d, heures: h });
      }
    }
    setState((prev) => ({
      ...prev,
      timeEntries: [...prev.timeEntries.filter((t) => !(t.employeeId === employeeId && daySet.has(t.date))), ...added],
    }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function removeEntry(entry: TimeEntry) {
    setState((prev) => ({ ...prev, timeEntries: prev.timeEntries.filter((t) => t.id !== entry.id) }));
  }

  const recapParProjet = useMemo(() => {
    const map = new Map<string, Map<string, number>>(); // projectId -> employeeId -> heures
    for (const t of state.timeEntries) {
      if (!map.has(t.projectId)) map.set(t.projectId, new Map());
      const m = map.get(t.projectId)!;
      m.set(t.employeeId, (m.get(t.employeeId) ?? 0) + t.heures);
    }
    return map;
  }, [state.timeEntries]);

  const historique = useMemo(
    () =>
      state.timeEntries
        .filter((t) => t.employeeId === employeeId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20),
    [state.timeEntries, employeeId]
  );

  const cellStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9" };
  const headStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "center", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" };

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Temps par équipe</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Chaque collaborateur saisit ici le temps (en JH) passé sur chacune de ses équipes, semaine par semaine.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
          <h2 className="panel-title">Saisir mes temps</h2>
          {employees.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Aucun collaborateur actif — ajoutez des membres dans la page Administration.</p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
                  Collaborateur
                  <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {fullName(e)}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="btn-ghost" onClick={() => setAnchorDate((d) => addDaysISO(d, -7))} title="Semaine précédente">
                    ◀
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                    Semaine {week} — {formatDateShort(days[0])} au {formatDateShort(days[6])}
                  </span>
                  <button className="btn-ghost" onClick={() => setAnchorDate((d) => addDaysISO(d, 7))} title="Semaine suivante">
                    ▶
                  </button>
                  <button className="btn-ghost" onClick={() => setAnchorDate(todayISO())}>
                    Aujourd'hui
                  </button>
                </div>
              </div>

              {myProjects.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                  {employee ? `${fullName(employee)} n'est assigné(e) à aucune équipe` : "Sélectionnez un collaborateur"} — allez dans la page
                  Administration pour l'assigner à une équipe.
                </p>
              ) : (
                <>
                  <table style={{ borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ ...headStyle, textAlign: "left" }}>Équipe</th>
                        {days.map((d) => (
                          <th key={d} style={headStyle}>
                            {weekdayLetter(d)} {formatDateShort(d)}
                          </th>
                        ))}
                        <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myProjects.map((p) => (
                        <tr key={p.id}>
                          <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, whiteSpace: "nowrap" }}>{p.nom}</td>
                          {days.map((d) => (
                            <td key={d} style={{ ...cellStyle, padding: "4px 6px" }}>
                              <input
                                className="input"
                                type="number"
                                min={0}
                                step="0.5"
                                style={{ width: 56, textAlign: "right" }}
                                value={draftHeures[entryKey(d, p.id)] ?? 0}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  if (!Number.isNaN(v)) editHeures(d, p.id, v);
                                }}
                              />
                            </td>
                          ))}
                          <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>{fmt(totalProjetSaisi(p.id))}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: 700, color: "#64748b" }}>Planning (repère)</td>
                        {days.map((d) => {
                          const v = dayIndex.get(`${employeeId}|${d}`)?.value;
                          return (
                            <td key={d} style={{ ...cellStyle, color: "#94a3b8" }}>
                              {v === undefined ? "—" : fmt(v)}
                            </td>
                          );
                        })}
                        <td style={cellStyle}></td>
                      </tr>
                      <tr>
                        <td style={{ padding: "6px 8px", fontWeight: 700 }}>Total saisi</td>
                        {days.map((d) => {
                          const total = totalJourSaisi(d);
                          const planning = dayIndex.get(`${employeeId}|${d}`)?.value;
                          const mismatch = planning !== undefined && total !== planning;
                          return (
                            <td key={d} style={{ ...cellStyle, fontWeight: 700, color: mismatch ? "#b45309" : "#334155" }}>
                              {fmt(total)}
                            </td>
                          );
                        })}
                        <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                          {fmt(days.reduce((s, d) => s + totalJourSaisi(d), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <button className="btn-primary" onClick={saveWeek}>
                    {savedFlash ? "Enregistré ✓" : "Enregistrer la semaine"}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {recapParProjet.size > 0 && (
          <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
            <h2 className="panel-title">Récapitulatif par équipe (JH cumulés)</h2>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "left" }}>Équipe</th>
                  {employees.map((e) => (
                    <th key={e.id} style={headStyle}>
                      {fullName(e)}
                    </th>
                  ))}
                  <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {state.projects.map((p) => {
                  const parEmp = recapParProjet.get(p.id);
                  if (!parEmp) return null;
                  const total = [...parEmp.values()].reduce((s, v) => s + v, 0);
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, whiteSpace: "nowrap" }}>{p.nom}</td>
                      {employees.map((e) => (
                        <td key={e.id} style={cellStyle}>
                          {fmt(parEmp.get(e.id) ?? 0)}
                        </td>
                      ))}
                      <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>{fmt(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {employee && (
          <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
            <h2 className="panel-title">Historique — {fullName(employee)}</h2>
            {historique.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Aucune saisie pour le moment.</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ ...headStyle, textAlign: "left" }}>Date</th>
                    <th style={{ ...headStyle, textAlign: "left" }}>Équipe</th>
                    <th style={headStyle}>JH</th>
                    <th style={headStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((t) => (
                    <tr key={t.id}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{formatDateFR(t.date)}</td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                        {state.projects.find((p) => p.id === t.projectId)?.nom ?? "?"}
                      </td>
                      <td style={cellStyle}>{fmt(t.heures)}</td>
                      <td style={cellStyle}>
                        <button className="btn-ghost" onClick={() => removeEntry(t)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
