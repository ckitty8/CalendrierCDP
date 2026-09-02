import { useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import { useToast } from "../ToastContext";
import { employeeColor, formatBirthday, fullName } from "../lib";

interface Draft {
  forfaitJours: string;
  dateAnniversaire: string;
}

export default function Team() {
  const { state, refresh } = useAppState();
  const { notify } = useToast();
  const [newNom, setNewNom] = useState("");
  const [newPrenom, setNewPrenom] = useState("");
  const [newDateAnniversaire, setNewDateAnniversaire] = useState("");
  const [newRole, setNewRole] = useState("Développeur");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!state) return <div className="text-slate-500">Chargement…</div>;

  function draftFor(id: string, forfaitJours: number, dateAnniversaire: string | null): Draft {
    return drafts[id] ?? { forfaitJours: String(forfaitJours), dateAnniversaire: dateAnniversaire ?? "" };
  }

  function isDirty(id: string, forfaitJours: number, dateAnniversaire: string | null): boolean {
    const d = drafts[id];
    if (!d) return false;
    return d.forfaitJours !== String(forfaitJours) || d.dateAnniversaire !== (dateAnniversaire ?? "");
  }

  async function addEmployee() {
    if (!newNom.trim()) return setFormError("Le nom est obligatoire.");
    if (!newPrenom.trim()) return setFormError("Le prénom est obligatoire.");
    setFormError(null);
    setBusy(true);
    try {
      await api.addEmployee({
        nom: newNom.trim(),
        prenom: newPrenom.trim(),
        dateAnniversaire: newDateAnniversaire || null,
        role: newRole,
        active: true,
        forfaitJours: 218,
      });
      setNewNom("");
      setNewPrenom("");
      setNewDateAnniversaire("");
      await refresh();
      notify("Personne ajoutée");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await api.updateEmployee(id, { active: !active });
    await refresh();
  }

  async function saveRow(id: string) {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    try {
      await api.updateEmployee(id, {
        forfaitJours: Number(d.forfaitJours) || 0,
        dateAnniversaire: d.dateAnniversaire || null,
      });
      await refresh();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      notify("Enregistré");
    } catch {
      notify("Échec de l'enregistrement", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette personne et toutes ses données de planning ?")) return;
    await api.deleteEmployee(id);
    await refresh();
    notify("Personne supprimée");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {state.employees.map((emp, i) => {
          const d = draftFor(emp.id, emp.forfaitJours, emp.dateAnniversaire);
          const dirty = isDirty(emp.id, emp.forfaitJours, emp.dateAnniversaire);
          return (
            <div key={emp.id} className="flex items-center gap-4 p-4 flex-wrap">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: employeeColor(i) }} />
              <div className="flex-1 min-w-[160px]">
                <div className="font-medium text-slate-800">{fullName(emp)}</div>
                <div className="text-xs text-slate-500">{emp.role}</div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Anniversaire
                <input
                  type="date"
                  value={d.dateAnniversaire}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [emp.id]: { ...d, dateAnniversaire: e.target.value } }))
                  }
                  className="rounded border border-slate-200 px-1.5 py-1"
                />
                {emp.dateAnniversaire && !dirty && (
                  <span className="text-slate-400">({formatBirthday(emp.dateAnniversaire)})</span>
                )}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Forfait
                <input
                  type="number"
                  value={d.forfaitJours}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [emp.id]: { ...d, forfaitJours: e.target.value } }))}
                  className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right"
                />
                j
              </label>
              <button
                disabled={!dirty || savingId === emp.id}
                onClick={() => saveRow(emp.id)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-600 text-white disabled:opacity-40 disabled:bg-slate-300"
              >
                {savingId === emp.id ? "..." : "Enregistrer"}
              </button>
              <button
                onClick={() => toggleActive(emp.id, emp.active)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  emp.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {emp.active ? "Actif" : "Inactif"}
              </button>
              <button onClick={() => remove(emp.id)} className="text-xs text-red-500 hover:text-red-700">
                Supprimer
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 max-w-xl">
        <h2 className="font-semibold text-slate-900 mb-3">Ajouter une personne</h2>
        <div className="flex gap-2 flex-wrap items-start">
          <div>
            <input
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              placeholder="Nom *"
              className="rounded border border-slate-200 px-2 py-1.5 text-sm w-32"
            />
          </div>
          <div>
            <input
              value={newPrenom}
              onChange={(e) => setNewPrenom(e.target.value)}
              placeholder="Prénom *"
              className="rounded border border-slate-200 px-2 py-1.5 text-sm w-32"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="date"
              value={newDateAnniversaire}
              onChange={(e) => setNewDateAnniversaire(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option>Développeur</option>
            <option>PO / Lead</option>
            <option>QA</option>
            <option>Autre</option>
          </select>
          <button
            disabled={busy}
            onClick={addEmployee}
            className="rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
        <p className="mt-2 text-xs text-slate-400">* Champs obligatoires. La date d'anniversaire est optionnelle.</p>
      </div>
    </div>
  );
}
