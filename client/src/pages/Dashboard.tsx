import { useEffect, useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import type { DashboardData } from "../types";
import { employeeColor, formatBirthday, formatJH, fullName, upcomingBirthdays } from "../lib";

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  const toneClass =
    tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { state } = useAppState();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData);
  }, [state]);

  if (!state || !data) return <div className="text-slate-500">Chargement du tableau de bord…</div>;

  const empById = Object.fromEntries(state.employees.map((e) => [e.id, e]));
  const activeEmployees = state.employees.filter((e) => e.active);
  const currentSprint = state.sprints.find((s) => s.id === data.currentSprintId);

  const totalCapacity = data.currentSprintCapacity.reduce((s, c) => s + c.jours, 0);
  const worstBalance = [...data.leaveBalances]
    .filter((b) => activeEmployees.some((e) => e.id === b.employeeId))
    .sort((a, b) => a.ecart - b.ecart)[0];

  const allocById = Object.fromEntries(state.ticketTypes.map((t) => [t.id, t]));
  const totalAlloc = data.currentSprintAllocation.reduce((s, a) => s + a.jh, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          {currentSprint ? `${currentSprint.label} — ${currentSprint.monthLabel} ${currentSprint.year}` : "Aucun sprint courant"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Équipe active" value={String(activeEmployees.length)} sub={`${state.employees.length} au total`} />
        <Card label="Capacité sprint courant" value={`${formatJH(totalCapacity)} JH`} />
        <Card
          label="Écart forfait le plus critique"
          value={worstBalance ? `${formatJH(worstBalance.ecart)} j` : "—"}
          sub={worstBalance && empById[worstBalance.employeeId] ? fullName(empById[worstBalance.employeeId]) : undefined}
          tone={worstBalance && worstBalance.ecart < -10 ? "bad" : worstBalance && worstBalance.ecart < 0 ? "warn" : "ok"}
        />
        <Card
          label="Alertes de congés simultanés"
          value={String(data.overlapWarnings.length)}
          tone={data.overlapWarnings.length > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Répartition du sprint courant par type de ticket</h2>
          <div className="space-y-2">
            {data.currentSprintAllocation
              .slice()
              .sort((a, b) => b.jh - a.jh)
              .map((a) => {
                const t = allocById[a.ticketTypeId];
                const pct = (a.jh / totalAlloc) * 100;
                return (
                  <div key={a.ticketTypeId}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span>{t?.label ?? a.ticketTypeId}</span>
                      <span>{formatJH(a.jh)} JH</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            {data.currentSprintAllocation.length === 0 && (
              <p className="text-sm text-slate-400">Pas de données pour ce sprint.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Solde congés / forfait (218j) par personne</h2>
          <div className="space-y-2">
            {data.leaveBalances
              .filter((b) => activeEmployees.some((e) => e.id === b.employeeId))
              .map((b, i) => (
                <div key={b.employeeId} className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: employeeColor(i) }}
                  />
                  <span className="text-sm text-slate-700 flex-1">
                    {empById[b.employeeId] ? fullName(empById[b.employeeId]) : ""}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      b.ecart < -10 ? "text-red-600" : b.ecart < 0 ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {b.ecart > 0 ? "+" : ""}
                    {formatJH(b.ecart)} j
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-3">Alertes de congés simultanés (≥ 50% de l'équipe absente le même jour)</h2>
        {data.overlapWarnings.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune alerte.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.overlapWarnings.map((w) => (
              <li key={w.date} className="py-2 flex justify-between text-sm">
                <span className="text-slate-700">
                  {new Date(w.date + "T00:00:00Z").toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
                <span className="text-amber-600">
                  {w.absentEmployees.map((id) => (empById[id] ? fullName(empById[id]) : "")).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {upcomingBirthdays(activeEmployees).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Prochains anniversaires (30 jours)</h2>
          <ul className="divide-y divide-slate-100">
            {upcomingBirthdays(activeEmployees).map(({ employee, daysUntil }) => (
              <li key={employee.id} className="py-2 flex justify-between text-sm">
                <span className="text-slate-700">{fullName(employee)}</span>
                <span className="text-slate-500">
                  {formatBirthday(employee.dateAnniversaire!)}
                  {daysUntil === 0 ? " — aujourd'hui" : daysUntil === 1 ? " — demain" : ` — dans ${daysUntil} j`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.estimationVariances.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-3">Écarts estimé / réalisé</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1">Sprint</th>
                <th className="py-1">Type</th>
                <th className="py-1 text-right">Estimé</th>
                <th className="py-1 text-right">Réalisé</th>
                <th className="py-1 text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              {data.estimationVariances.map((v) => {
                const sprint = state.sprints.find((s) => s.id === v.sprintId);
                const type = state.ticketTypes.find((t) => t.id === v.ticketTypeId);
                return (
                  <tr key={`${v.sprintId}-${v.ticketTypeId}`} className="border-t border-slate-100">
                    <td className="py-1">{sprint?.label}</td>
                    <td className="py-1">{type?.label}</td>
                    <td className="py-1 text-right">{formatJH(v.estimatedJH)}</td>
                    <td className="py-1 text-right">{formatJH(v.spentJH)}</td>
                    <td className={`py-1 text-right font-medium ${v.overBudget ? "text-red-600" : "text-emerald-600"}`}>
                      {v.deltaJH > 0 ? "+" : ""}
                      {formatJH(v.deltaJH)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
