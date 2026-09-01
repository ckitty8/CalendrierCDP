import { useState } from "react";
import { api } from "../api";
import { useAppState } from "../AppStateContext";
import { employeeColor } from "../lib";

export default function Team() {
  const { state, refresh } = useAppState();
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Développeur");
  const [busy, setBusy] = useState(false);

  if (!state) return <div className="text-slate-500">Chargement…</div>;

  async function addEmployee() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.addEmployee({ name: newName.trim(), role: newRole, active: true, forfaitJours: 218 });
      setNewName("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await api.updateEmployee(id, { active: !active });
    await refresh();
  }

  async function updateForfait(id: string, forfaitJours: number) {
    await api.updateEmployee(id, { forfaitJours });
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette personne et toutes ses données de planning ?")) return;
    await api.deleteEmployee(id);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {state.employees.map((emp, i) => (
          <div key={emp.id} className="flex items-center gap-4 p-4">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: employeeColor(i) }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800">{emp.name}</div>
              <div className="text-xs text-slate-500">{emp.role}</div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Forfait
              <input
                type="number"
                defaultValue={emp.forfaitJours}
                onBlur={(e) => updateForfait(emp.id, Number(e.target.value))}
                className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right"
              />
              j
            </label>
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
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 max-w-md">
        <h2 className="font-semibold text-slate-900 mb-3">Ajouter une personne</h2>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom Prénom"
            className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
          />
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
      </div>
    </div>
  );
}
