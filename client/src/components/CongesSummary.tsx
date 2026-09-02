import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import type { CongesRow, LeaveBalance } from "../types";
import { MONTH_LABELS, formatJH, fullName } from "../lib";

const COLOR_TRAVAILLE = "#1a52d1"; // brand-700
const COLOR_CONGES = "#d97706"; // amber-600
const ECART_GOOD = "#16a34a"; // emerald-600
const ECART_WARN = "#d97706"; // amber-600
const ECART_BAD = "#dc2626"; // red-600
const ECART_SCALE = 30; // jours au-delà desquels la barre est pleine

function RepartitionBar({ travaille, conges }: { travaille: number; conges: number }) {
  const total = travaille + conges;
  if (total <= 0) return <div className="h-2 w-24 rounded-full bg-slate-100" />;
  const travPct = (travaille / total) * 100;
  const congPct = 100 - travPct;
  return (
    <div className="flex h-2 w-24 rounded-full overflow-hidden bg-slate-100" title={`${formatJH(travaille)}j travaillés, ${formatJH(conges)}j congés`}>
      <div style={{ width: `${travPct}%`, background: COLOR_TRAVAILLE }} />
      {travPct > 0 && congPct > 0 && <div className="w-[2px] bg-white shrink-0" />}
      <div style={{ width: `${congPct}%`, background: COLOR_CONGES }} />
    </div>
  );
}

function EcartMeter({ ecart }: { ecart: number }) {
  const color = ecart < -10 ? ECART_BAD : ecart < 0 ? ECART_WARN : ECART_GOOD;
  const pct = Math.min(100, (Math.abs(ecart) / ECART_SCALE) * 50);
  return (
    <div className="relative w-16 h-2 rounded-full bg-slate-100 mx-auto" title={`Écart : ${ecart > 0 ? "+" : ""}${formatJH(ecart)}j`}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          background: color,
          width: `${pct}%`,
          left: ecart >= 0 ? "50%" : `${50 - pct}%`,
        }}
      />
    </div>
  );
}

export default function CongesSummary() {
  const { state } = useAppState();
  const [data, setData] = useState<{ rollup: CongesRow[]; balances: LeaveBalance[] } | null>(null);

  useEffect(() => {
    api.getConges().then(setData);
  }, [state]);

  if (!state || !data) return <div className="text-slate-500">Chargement…</div>;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Congés {state.meta.currentYear}</h2>
        <p className="text-sm text-slate-500">
          Une demi-journée compte 0.5j travaillé et 0.5j congé. Écart = jours travaillés réels − forfait annuel (218j par défaut).
        </p>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_TRAVAILLE }} /> Travaillé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_CONGES }} /> Congés
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500">
              <th className="sticky left-0 bg-white p-2 text-left border-b border-slate-200 min-w-[160px]">Employé</th>
              <th className="p-2 text-center border-b border-l border-slate-200 min-w-[110px]">Répartition {state.meta.currentYear}</th>
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
              <th className="border-b border-l border-slate-200"></th>
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
                    {fullName(emp)}
                  </td>
                  <td className="p-1 border-b border-l border-slate-100">
                    <div className="flex justify-center">
                      <RepartitionBar travaille={bal?.totalTravaille ?? 0} conges={bal?.totalConges ?? 0} />
                    </div>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const r = data.rollup.find((x) => x.employeeId === emp.id && x.month === month);
                    return (
                      <Fragment key={month}>
                        <td className="p-1 text-center border-b border-l border-slate-100 tabular-nums">
                          {r?.travaille || ""}
                        </td>
                        <td className="p-1 text-center border-b border-slate-100 text-amber-600 tabular-nums">
                          {r?.conges || ""}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="p-1 text-center border-b border-l border-slate-100 font-medium tabular-nums">
                    {bal ? formatJH(bal.totalTravaille) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-slate-100 text-amber-600 font-medium tabular-nums">
                    {bal ? formatJH(bal.totalConges) : ""}
                  </td>
                  <td className="p-1 text-center border-b border-slate-100 text-slate-500 tabular-nums">
                    {bal?.forfaitJours}
                  </td>
                  <td className="p-1 border-b border-slate-100">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-semibold tabular-nums ${
                          bal && bal.ecart < -10 ? "text-red-600" : bal && bal.ecart < 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {bal ? `${bal.ecart > 0 ? "+" : ""}${formatJH(bal.ecart)}` : ""}
                      </span>
                      {bal && <EcartMeter ecart={bal.ecart} />}
                    </div>
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
