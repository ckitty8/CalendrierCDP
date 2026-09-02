import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import type { CongesRow, LeaveBalance } from "../types";
import { MONTH_LABELS, formatJH, frenchPublicHolidays, fullName, joursOuvresDuMois, joursOuvresHorsFeries } from "../lib";

export default function CongesSummary() {
  const { state } = useAppState();
  const [data, setData] = useState<{ rollup: CongesRow[]; balances: LeaveBalance[] } | null>(null);

  useEffect(() => {
    api.getConges().then(setData);
  }, [state]);

  const holidays = useMemo(
    () => (state ? frenchPublicHolidays(state.meta.currentYear) : new Set<string>()),
    [state]
  );

  if (!state || !data) return <div className="text-slate-500">Chargement…</div>;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Congés {state.meta.currentYear}</h2>
        <p className="text-sm text-slate-500">
          Une demi-journée compte 0.5j travaillé et 0.5j congé. Écart = jours travaillés réels − forfait annuel (218j par défaut).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500">
              <th rowSpan={2} className="sticky left-0 bg-white p-2 text-left align-bottom border-b-2 border-slate-300 min-w-[160px]">
                Employé
              </th>
              {MONTH_LABELS.map((m) => (
                <th key={m} colSpan={2} className="p-2 text-center border-b border-l-2 border-slate-300 bg-slate-50">
                  {m.slice(0, 3)}
                </th>
              ))}
              <th rowSpan={2} className="p-2 text-center align-bottom border-b-2 border-l-2 border-slate-300 min-w-[70px]">
                Total trav.
              </th>
              <th rowSpan={2} className="p-2 text-center align-bottom border-b-2 border-l border-slate-300 min-w-[70px]">
                Total congés
              </th>
              <th rowSpan={2} className="p-2 text-center align-bottom border-b-2 border-l border-slate-300 min-w-[60px]">
                Forfait
              </th>
              <th rowSpan={2} className="p-2 text-center align-bottom border-b-2 border-l-2 border-slate-300 min-w-[70px]">
                Écart
              </th>
            </tr>
            <tr className="text-slate-400">
              {MONTH_LABELS.map((m) => (
                <Fragment key={m}>
                  <th className="p-1 font-normal border-b-2 border-l-2 border-slate-300 bg-slate-50">Trav.</th>
                  <th className="p-1 font-normal border-b-2 border-slate-300 bg-slate-50">Cong.</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-emerald-50/60 text-slate-600 italic">
              <td className="sticky left-0 bg-emerald-50 p-2 border-b border-slate-200 font-medium">nb jour mois</td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <td key={month} colSpan={2} className="p-1 text-center border-b border-l-2 border-slate-200 tabular-nums">
                  {joursOuvresDuMois(state.meta.currentYear, month)}
                </td>
              ))}
              <td colSpan={4} className="border-b border-l-2 border-slate-200 bg-emerald-50"></td>
            </tr>
            <tr className="bg-emerald-50/60 text-slate-600 italic">
              <td className="sticky left-0 bg-emerald-50 p-2 border-b-2 border-slate-300 font-medium">nb jour mois tra</td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <td key={month} colSpan={2} className="p-1 text-center border-b-2 border-l-2 border-slate-300 tabular-nums">
                  {joursOuvresHorsFeries(state.meta.currentYear, month, holidays)}
                </td>
              ))}
              <td colSpan={4} className="border-b-2 border-l-2 border-slate-300 bg-emerald-50"></td>
            </tr>
            {state.employees.map((emp) => {
              const bal = data.balances.find((b) => b.employeeId === emp.id);
              return (
                <tr key={emp.id} className={emp.active ? "" : "opacity-50"}>
                  <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium text-slate-700">
                    {fullName(emp)}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const r = data.rollup.find((x) => x.employeeId === emp.id && x.month === month);
                    return (
                      <Fragment key={month}>
                        <td className="p-1 text-center border-b border-l-2 border-slate-200 tabular-nums">
                          {r?.travaille || ""}
                        </td>
                        <td className="p-1 text-center border-b border-slate-100 text-amber-600 tabular-nums">
                          {r?.conges || ""}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="p-1 text-center border-b border-l-2 border-slate-200 font-medium tabular-nums">
                    {bal ? formatJH(bal.totalTravaille) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-l border-slate-100 text-amber-600 font-medium tabular-nums">
                    {bal ? formatJH(bal.totalConges) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-l border-slate-100 text-slate-500 tabular-nums">
                    {bal?.forfaitJours}
                  </td>
                  <td
                    className={`p-1 text-center border-b border-l-2 border-slate-200 font-semibold tabular-nums ${
                      bal && bal.ecart < -10 ? "text-red-600" : bal && bal.ecart < 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {bal ? `${bal.ecart > 0 ? "+" : ""}${formatJH(bal.ecart)}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
