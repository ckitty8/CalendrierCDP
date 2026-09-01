import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import type { CongesRow, LeaveBalance } from "../types";
import { MONTH_LABELS, formatJH } from "../lib";

export default function Conges() {
  const { state } = useAppState();
  const [data, setData] = useState<{ rollup: CongesRow[]; balances: LeaveBalance[] } | null>(null);

  useEffect(() => {
    api.getConges().then(setData);
  }, [state]);

  if (!state || !data) return <div className="text-slate-500">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Congés {state.meta.currentYear}</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Une demi-journée compte 0.5j travaillé et 0.5j congé. Écart = jours travaillés réels − forfait annuel (218j par défaut).
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500">
              <th className="sticky left-0 bg-white p-2 text-left border-b border-slate-200 min-w-[160px]">Employé</th>
              {MONTH_LABELS.map((m) => (
                <th key={m} colSpan={2} className="p-2 text-center border-b border-l border-slate-200">
                  {m.slice(0, 3)}
                </th>
              ))}
              <th className="p-2 text-center border-b border-l border-slate-200">Total trav.</th>
              <th className="p-2 text-center border-b border-l border-slate-200">Total congés</th>
              <th className="p-2 text-center border-b border-l border-slate-200">Forfait</th>
              <th className="p-2 text-center border-b border-l border-slate-200">Écart</th>
            </tr>
            <tr className="text-slate-400">
              <th className="sticky left-0 bg-white border-b border-slate-200"></th>
              {MONTH_LABELS.map((m) => (
                <Fragment key={m}>
                  <th className="p-1 font-normal border-b border-l border-slate-200">Trav.</th>
                  <th className="p-1 font-normal border-b border-slate-200">Cong.</th>
                </Fragment>
              ))}
              <th className="border-b border-l border-slate-200"></th>
              <th className="border-b border-slate-200"></th>
              <th className="border-b border-slate-200"></th>
              <th className="border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody>
            {state.employees.map((emp) => {
              const bal = data.balances.find((b) => b.employeeId === emp.id);
              return (
                <tr key={emp.id} className={emp.active ? "" : "opacity-50"}>
                  <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium text-slate-700">
                    {emp.name}
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const r = data.rollup.find((x) => x.employeeId === emp.id && x.month === month);
                    return (
                      <Fragment key={month}>
                        <td className="p-1 text-center border-b border-l border-slate-100">
                          {r?.travaille || ""}
                        </td>
                        <td className="p-1 text-center border-b border-slate-100 text-amber-600">
                          {r?.conges || ""}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="p-1 text-center border-b border-l border-slate-100 font-medium">
                    {bal ? formatJH(bal.totalTravaille) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-slate-100 text-amber-600 font-medium">
                    {bal ? formatJH(bal.totalConges) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-slate-100 text-slate-500">
                    {bal?.forfaitJours}
                  </td>
                  <td
                    className={`p-1 text-center border-b border-slate-100 font-semibold ${
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
