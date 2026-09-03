import { Fragment, useMemo, useState } from "react";
import type { DayEntry } from "./types";
import { MONTH_LABELS, daysInMonth, fullName, isoDate } from "./lib";
import type { PlanningState } from "./usePlanningState";

interface CongesPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
  embedded?: boolean;
}

interface MonthStats {
  travaille: number;
  conges: number;
}

/**
 * Reproduit exactement les formules du fichier Excel source
 * (feuille "Jours de congés") :
 *   Travaillé = COUNTIF(plage,"=1") + SUMIF(plage,"=0,5")
 *   Congés    = COUNTIF(plage,"=0") + SUMIF(plage,"=0,5")
 * Une cellule vide (jour non saisi, y compris les week-ends) ne compte
 * ni dans l'un ni dans l'autre — seules les valeurs explicitement
 * saisies dans le Planning sont comptabilisées, fériés/fermetures
 * compris (comme dans le fichier).
 */
function computeMonthStats(employeeId: string, year: number, month: number, dayIndex: Map<string, DayEntry>): MonthStats {
  const n = daysInMonth(year, month);
  let travaille = 0;
  let conges = 0;

  for (let day = 1; day <= n; day++) {
    const date = isoDate(year, month, day);
    const entry = dayIndex.get(`${employeeId}|${date}`);
    if (!entry) continue;
    if (entry.value === 1) travaille += 1;
    else if (entry.value === 0.5) {
      travaille += 0.5;
      conges += 0.5;
    } else if (entry.value === 0) conges += 1;
  }

  return { travaille, conges };
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export default function CongesPage({ state, setState, embedded }: CongesPageProps) {
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

  const table = useMemo(() => {
    return employees.map((emp) => {
      const months = MONTH_LABELS.map((_, i) => computeMonthStats(emp.id, state.year, i + 1, dayIndex));
      const total = months.reduce(
        (acc, m) => ({ travaille: acc.travaille + m.travaille, conges: acc.conges + m.conges }),
        { travaille: 0, conges: 0 }
      );
      return { emp, months, total };
    });
  }, [employees, state.year, dayIndex]);

  const teamTotal = useMemo(() => {
    return MONTH_LABELS.map((_, i) =>
      table.reduce(
        (acc, row) => ({ travaille: acc.travaille + row.months[i].travaille, conges: acc.conges + row.months[i].conges }),
        { travaille: 0, conges: 0 }
      )
    );
  }, [table]);

  const cellStyle: React.CSSProperties = { padding: "5px 6px", textAlign: "center", borderBottom: "1px solid #f1f5f9" };

  return (
    <div>
      {!embedded && (
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Jours de congés</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Calculé automatiquement à partir du Planning, avec les mêmes formules que le fichier Excel d'origine : "Trav."
            compte les cellules à 1 (+ 0,5 pour les demi-journées) et "Cong." compte les cellules à 0 (+ 0,5 pour les
            demi-journées) — jours fériés et fermetures inclus, comme dans le fichier. Les jours non saisis ne comptent nulle
            part. "Total jour travaillé client" = jours travaillés dans l'année moins l'objectif imposé par le client (par
            défaut 218, modifiable ci-dessous) — c'est le nombre de jours de congés qu'il reste à prendre pour que les jours
            travaillés tombent pile sur cet objectif (en rouge si positif : il reste des congés à prendre ; en vert si 0 ou
            négatif). Modifiez le Planning pour changer ces chiffres.
          </p>
        </header>
      )}

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

      <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", maxHeight: "75vh", paddingBottom: 20 }}>
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
                title="Jours de congés qu'il reste à prendre pour que les jours travaillés égalent l'objectif imposé par le client"
              >
                Total jour travaillé client
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
                    color: total.travaille - state.objectifJoursTravailles > 0 ? "#dc2626" : "#047857",
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
              <td style={{ ...cellStyle, background: "#dbeafe" }} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
