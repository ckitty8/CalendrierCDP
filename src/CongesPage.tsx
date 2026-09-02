import { Fragment, useMemo, useState } from "react";
import type { DayEntry } from "./types";
import { MONTH_LABELS, daysInMonth, frenchPublicHolidays, fullName, isWeekend, isoDate } from "./lib";
import type { PlanningState } from "./usePlanningState";

interface CongesPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
}

interface MonthStats {
  joursOuvres: number;
  travaille: number;
  conges: number;
}

function computeMonthStats(
  employeeId: string,
  year: number,
  month: number,
  dayIndex: Map<string, DayEntry>,
  holidaySet: Set<string>
): MonthStats {
  const n = daysInMonth(year, month);
  let joursOuvres = 0;
  let travaille = 0;
  let conges = 0;

  for (let day = 1; day <= n; day++) {
    const date = isoDate(year, month, day);
    if (isWeekend(date)) continue;
    const entry = dayIndex.get(`${employeeId}|${date}`);
    const category = entry?.category ?? (holidaySet.has(date) ? "ferie" : "normal");
    if (category === "ferie" || category === "fermeture") continue;
    joursOuvres += 1;
    const value = entry?.value ?? 1;
    travaille += value;
    conges += 1 - value;
  }

  return { joursOuvres, travaille, conges };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function CongesPage({ state, setState }: CongesPageProps) {
  const [showInactive, setShowInactive] = useState(false);

  const employees = useMemo(
    () => state.employees.filter((e) => e.active || showInactive),
    [state.employees, showInactive]
  );

  const dayIndex = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const d of state.days) m.set(`${d.employeeId}|${d.date}`, d);
    return m;
  }, [state.days]);

  const holidaySet = useMemo(() => frenchPublicHolidays(state.year), [state.year]);

  const table = useMemo(() => {
    return employees.map((emp) => {
      const months = MONTH_LABELS.map((_, i) => computeMonthStats(emp.id, state.year, i + 1, dayIndex, holidaySet));
      const total = months.reduce(
        (acc, m) => ({
          joursOuvres: acc.joursOuvres + m.joursOuvres,
          travaille: acc.travaille + m.travaille,
          conges: acc.conges + m.conges,
        }),
        { joursOuvres: 0, travaille: 0, conges: 0 }
      );
      return { emp, months, total };
    });
  }, [employees, state.year, dayIndex, holidaySet]);

  const teamTotal = useMemo(() => {
    return MONTH_LABELS.map((_, i) =>
      table.reduce(
        (acc, row) => ({
          joursOuvres: acc.joursOuvres + row.months[i].joursOuvres,
          travaille: acc.travaille + row.months[i].travaille,
          conges: acc.conges + row.months[i].conges,
        }),
        { joursOuvres: 0, travaille: 0, conges: 0 }
      )
    );
  }, [table]);

  const cellStyle: React.CSSProperties = { padding: "5px 6px", textAlign: "center", borderBottom: "1px solid #f1f5f9" };

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Jours de congés {state.year}</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Calculé automatiquement à partir du Planning : pour chaque mois, "Trav." = somme des valeurs saisies, "Cong." =
          jours ouvrés (hors fériés/fermetures) non travaillés. "Reste" = jours travaillés dans l'année moins l'objectif
          imposé par le client (par défaut 218, modifiable ci-dessous). Modifiez le Planning pour changer ces chiffres.
        </p>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Afficher les collaborateurs inactifs
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
          Objectif de jours travaillés / an (imposé par le client)
          <input
            className="input"
            type="number"
            min={0}
            style={{ width: 70 }}
            value={state.objectifJoursTravailles}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setState((prev) => ({ ...prev, objectifJoursTravailles: v }));
            }}
          />
        </label>
      </div>

      <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", maxHeight: "75vh" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky-col sticky-row col-name"
                style={{ textAlign: "left", padding: "6px 10px", top: 0 }}
              >
                Collaborateur
              </th>
              {MONTH_LABELS.map((label) => (
                <th
                  key={label}
                  colSpan={2}
                  className="sticky-row"
                  style={{ top: 0, padding: "4px 6px", fontWeight: 700, color: "#475569", background: "#eef2ff", borderLeft: "2px solid #fff" }}
                >
                  {label}
                </th>
              ))}
              <th
                colSpan={3}
                className="sticky-row"
                style={{ top: 0, padding: "4px 6px", fontWeight: 700, color: "#1e3a8a", background: "#dbeafe", borderLeft: "2px solid #fff" }}
              >
                Total annuel
              </th>
            </tr>
            <tr>
              {MONTH_LABELS.map((label) => (
                <Fragment key={label}>
                  <th className="sticky-row" style={{ top: 24, padding: "3px 6px", fontWeight: 500, color: "#64748b", borderLeft: "2px solid #fff" }}>
                    Trav.
                  </th>
                  <th className="sticky-row" style={{ top: 24, padding: "3px 6px", fontWeight: 500, color: "#64748b" }}>
                    Cong.
                  </th>
                </Fragment>
              ))}
              <th className="sticky-row" style={{ top: 24, padding: "3px 6px", fontWeight: 600, color: "#1e3a8a", borderLeft: "2px solid #fff", background: "#eff6ff" }}>
                Trav.
              </th>
              <th className="sticky-row" style={{ top: 24, padding: "3px 6px", fontWeight: 600, color: "#1e3a8a", background: "#eff6ff" }}>
                Cong.
              </th>
              <th
                className="sticky-row"
                style={{ top: 24, padding: "3px 6px", fontWeight: 600, color: "#1e3a8a", background: "#eff6ff" }}
                title="Jours travaillés - objectif imposé par le client"
              >
                Reste
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map(({ emp, months, total }) => (
              <tr key={emp.id}>
                <td className="sticky-col col-name" style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap", opacity: emp.active ? 1 : 0.5 }}>
                  {fullName(emp)}
                </td>
                {months.map((m, i) => (
                  <Fragment key={i}>
                    <td style={{ ...cellStyle, borderLeft: "2px solid #f8fafc" }}>{fmt(m.travaille)}</td>
                    <td style={{ ...cellStyle, color: m.conges > 0 ? "#b45309" : "#94a3b8" }}>{fmt(m.conges)}</td>
                  </Fragment>
                ))}
                <td style={{ ...cellStyle, borderLeft: "2px solid #f8fafc", fontWeight: 700, background: "#f8fafc" }}>{fmt(total.travaille)}</td>
                <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>{fmt(total.conges)}</td>
                <td
                  style={{
                    ...cellStyle,
                    fontWeight: 700,
                    background: "#f8fafc",
                    color: total.travaille - state.objectifJoursTravailles < 0 ? "#dc2626" : "#047857",
                  }}
                >
                  {fmt(total.travaille - state.objectifJoursTravailles)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="sticky-col col-name" style={{ padding: "6px 10px", fontWeight: 700 }}>
                Total équipe
              </td>
              {teamTotal.map((m, i) => (
                <Fragment key={i}>
                  <td style={{ ...cellStyle, borderLeft: "2px solid #f8fafc", fontWeight: 700 }}>{fmt(m.travaille)}</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>{fmt(m.conges)}</td>
                </Fragment>
              ))}
              <td style={{ ...cellStyle, borderLeft: "2px solid #f8fafc", fontWeight: 700, background: "#dbeafe" }}>
                {fmt(teamTotal.reduce((s, m) => s + m.travaille, 0))}
              </td>
              <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                {fmt(teamTotal.reduce((s, m) => s + m.conges, 0))}
              </td>
              <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                {fmt(teamTotal.reduce((s, m) => s + m.travaille, 0) - state.objectifJoursTravailles * table.length)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
