import { useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import { useToast } from "../ToastContext";

export default function TicketTypes() {
  const { state, refresh } = useAppState();
  const { notify } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!state) return <div className="text-slate-500">Chargement…</div>;

  const fixed = state.ticketTypes.filter((t) => !t.isRemainder).sort((a, b) => a.order - b.order);
  const remainder = state.ticketTypes.find((t) => t.isRemainder);
  const sumFixed = fixed.reduce((s, t) => s + (Number(drafts[t.id] ?? (t.percent ?? 0) * 100) || 0), 0);

  async function saveAll() {
    setSaving(true);
    try {
      const updated = state!.ticketTypes.map((t) => {
        if (t.isRemainder) return t;
        const raw = drafts[t.id];
        const pct = raw !== undefined ? Number(raw) / 100 : t.percent;
        return { ...t, percent: pct };
      });
      await api.setTicketTypes(updated);
      await refresh();
      setDrafts({});
      notify("Enregistré");
    } catch {
      notify("Échec de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Types de ticket</h1>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Répartition de la capacité (%)</h2>
        <p className="text-sm text-slate-500 mb-3">
          "US" absorbe automatiquement le reste (100% − somme des autres types). Le budget JH par sprint est recalculé
          immédiatement dans l'onglet Capacité & Sprints.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3 max-w-lg">
          {fixed.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">{t.label}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  className="w-20 text-right text-sm rounded border border-slate-200 px-2 py-1"
                  value={drafts[t.id] ?? Math.round((t.percent ?? 0) * 1000) / 10}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className="text-sm font-medium text-slate-700">{remainder?.label ?? "US"} (calculé)</span>
            <span className="text-sm font-semibold text-brand-600">{Math.round((100 - sumFixed) * 10) / 10}%</span>
          </div>
          <button
            disabled={saving || sumFixed > 100}
            onClick={saveAll}
            className="mt-2 w-full rounded-lg bg-brand-600 text-white text-sm font-medium py-2 disabled:opacity-50"
          >
            Enregistrer
          </button>
          {sumFixed > 100 && <p className="text-xs text-red-600">La somme dépasse 100%.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Définition — US (priorité demandeur / complexité)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="p-2">Type</th>
                <th className="p-2">Criticité</th>
                <th className="p-2">Priorité</th>
              </tr>
            </thead>
            <tbody>
              {state.ticketDefs.us.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.criticite}</td>
                  <td className="p-2">{r.priorite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Définition — Bug (SLA)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="p-2">Criticité</th>
                <th className="p-2">Priorité</th>
                <th className="p-2">Définition</th>
              </tr>
            </thead>
            <tbody>
              {state.ticketDefs.bug.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.criticite}</td>
                  <td className="p-2">{r.priorite}</td>
                  <td className="p-2 whitespace-pre-line">{r.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 mb-2">Définition — Incident (SLA)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="p-2">Criticité</th>
                <th className="p-2">Priorité</th>
                <th className="p-2">Définition</th>
              </tr>
            </thead>
            <tbody>
              {state.ticketDefs.incident.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.criticite}</td>
                  <td className="p-2">{r.priorite}</td>
                  <td className="p-2 whitespace-pre-line">{r.definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-2">{state.ticketDefs.glpi}</p>
      </div>
    </div>
  );
}
