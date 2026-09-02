import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import { useToast } from "../ToastContext";
import type { AllocationRow, CapacityRow } from "../types";
import { formatJH, fullName } from "../lib";

export default function Sprints() {
  const { state, refresh } = useAppState();
  const { notify } = useToast();
  const [mode, setMode] = useState<"reel" | "previsionnel">("reel");
  const [data, setData] = useState<{ capacity: CapacityRow[]; allocation: AllocationRow[] } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { estimatedJH: string; spentJH: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getCapacity(mode).then(setData);
  }, [mode, state]);

  if (!state || !data) return <div className="text-slate-500">Chargement…</div>;

  const activeEmployees = state.employees.filter((e) => e.active);
  const ticketTypes = [...state.ticketTypes].sort((a, b) => a.order - b.order);

  function estKey(sprintId: string, ticketTypeId: string) {
    return `${sprintId}|${ticketTypeId}`;
  }

  function draftFor(sprintId: string, ticketTypeId: string): { estimatedJH: string; spentJH: string } {
    const key = estKey(sprintId, ticketTypeId);
    if (drafts[key]) return drafts[key];
    const existing = state!.estimations.find((e) => e.sprintId === sprintId && e.ticketTypeId === ticketTypeId);
    return { estimatedJH: existing ? String(existing.estimatedJH) : "", spentJH: existing ? String(existing.spentJH) : "" };
  }

  async function saveEstimations() {
    const keys = Object.keys(drafts);
    if (keys.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        keys.map((key) => {
          const [sprintId, ticketTypeId] = key.split("|");
          const d = drafts[key];
          return api.setEstimation(sprintId, ticketTypeId, Number(d.estimatedJH) || 0, Number(d.spentJH) || 0);
        })
      );
      await refresh();
      setDrafts({});
      notify("Estimations enregistrées");
    } catch {
      notify("Échec de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Capacité & Sprints</h1>
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 text-sm">
          <button
            onClick={() => setMode("reel")}
            className={`px-3 py-1 rounded-md font-medium ${mode === "reel" ? "bg-brand-600 text-white" : "text-slate-600"}`}
          >
            Réel (calendrier)
          </button>
          <button
            onClick={() => setMode("previsionnel")}
            className={`px-3 py-1 rounded-md font-medium ${mode === "previsionnel" ? "bg-brand-600 text-white" : "text-slate-600"}`}
          >
            Prévisionnel
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500 -mt-4">
        {mode === "reel"
          ? "Capacité calculée à partir du planning réel (jours de présence saisis)."
          : "Capacité cible utilisée pour anticiper les sprints futurs (forfait annuel réparti sur l'année, ajustable par sprint)."}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500">
              <th className="sticky left-0 bg-white p-2 text-left border-b border-slate-200 min-w-[160px]">Employé</th>
              {state.sprints.map((s) => (
                <th key={s.id} className="p-2 text-center border-b border-l border-slate-200 min-w-[56px]">
                  {s.label}
                </th>
              ))}
              <th className="p-2 text-center border-b border-l border-slate-200 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((emp) => {
              const rows = data.capacity.filter((c) => c.employeeId === emp.id);
              const total = rows.reduce((s, r) => s + r.jours, 0);
              return (
                <tr key={emp.id}>
                  <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium text-slate-700">
                    {fullName(emp)}
                  </td>
                  {state.sprints.map((s) => {
                    const r = rows.find((x) => x.sprintId === s.id);
                    return (
                      <td key={s.id} className="p-1 text-center border-b border-l border-slate-100">
                        {r ? formatJH(r.jours) : "—"}
                      </td>
                    );
                  })}
                  <td className="p-1 text-center border-b border-l border-slate-100 font-semibold">{formatJH(total)}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 font-semibold">
              <td className="sticky left-0 bg-slate-50 p-2 border-b border-slate-100">TOTAL équipe</td>
              {state.sprints.map((s) => {
                const total = data.capacity.filter((c) => c.sprintId === s.id).reduce((sum, r) => sum + r.jours, 0);
                return (
                  <td key={s.id} className="p-1 text-center border-b border-l border-slate-100">
                    {formatJH(total)}
                  </td>
                );
              })}
              <td className="p-1 text-center border-b border-l border-slate-100">
                {formatJH(data.capacity.reduce((s, r) => s + r.jours, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Répartition par type de ticket (JH)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-slate-500">
                <th className="sticky left-0 bg-white p-2 text-left border-b border-slate-200 min-w-[140px]">Type</th>
                {state.sprints.map((s) => (
                  <th key={s.id} className="p-2 text-center border-b border-l border-slate-200 min-w-[56px]">
                    {s.label}
                  </th>
                ))}
                <th className="p-2 text-center border-b border-l border-slate-200 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((t) => {
                const rows = data.allocation.filter((a) => a.ticketTypeId === t.id);
                const total = rows.reduce((s, r) => s + r.jh, 0);
                return (
                  <tr key={t.id}>
                    <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium text-slate-700">
                      {t.label} {t.isRemainder ? "" : `(${Math.round((t.percent || 0) * 100)}%)`}
                    </td>
                    {state.sprints.map((s) => {
                      const r = rows.find((x) => x.sprintId === s.id);
                      return (
                        <td key={s.id} className="p-1 text-center border-b border-l border-slate-100">
                          {r ? formatJH(r.jh) : "—"}
                        </td>
                      );
                    })}
                    <td className="p-1 text-center border-b border-l border-slate-100 font-semibold">{formatJH(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="font-semibold text-slate-900">Estimé vs Réalisé (saisie manuelle depuis Azure DevOps)</h2>
          <button
            disabled={saving || Object.keys(drafts).length === 0}
            onClick={saveEstimations}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-brand-600 text-white disabled:opacity-40 disabled:bg-slate-300"
          >
            {saving ? "Enregistrement..." : `Enregistrer${Object.keys(drafts).length ? ` (${Object.keys(drafts).length})` : ""}`}
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-slate-500">
                <th className="sticky left-0 bg-white p-2 text-left border-b border-slate-200 min-w-[140px]">Type</th>
                {state.sprints.map((s) => (
                  <th key={s.id} colSpan={2} className="p-2 text-center border-b border-l border-slate-200 min-w-[90px]">
                    {s.label}
                  </th>
                ))}
              </tr>
              <tr className="text-slate-400">
                <th className="sticky left-0 bg-white border-b border-slate-200"></th>
                {state.sprints.map((s) => (
                  <Fragment key={s.id}>
                    <th className="p-1 font-normal border-b border-l border-slate-200">Est.</th>
                    <th className="p-1 font-normal border-b border-slate-200">Réal.</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((t) => (
                <tr key={t.id}>
                  <td className="sticky left-0 bg-white p-2 border-b border-slate-100 font-medium text-slate-700">
                    {t.label}
                  </td>
                  {state.sprints.map((s) => {
                    const d = draftFor(s.id, t.id);
                    const key = estKey(s.id, t.id);
                    return (
                      <Fragment key={s.id}>
                        <td className="border-b border-l border-slate-100 p-0.5">
                          <input
                            className="w-12 text-center text-xs rounded border border-slate-200 px-1 py-0.5"
                            value={d.estimatedJH}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [key]: { ...d, estimatedJH: e.target.value } }))
                            }
                          />
                        </td>
                        <td className="border-b border-slate-100 p-0.5">
                          <input
                            className="w-12 text-center text-xs rounded border border-slate-200 px-1 py-0.5"
                            value={d.spentJH}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [key]: { ...d, spentJH: e.target.value } }))
                            }
                          />
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
