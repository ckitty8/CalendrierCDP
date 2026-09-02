import { useState } from "react";
import type { Employee } from "./types";
import { fullName, slugify } from "./lib";
import type { PlanningState } from "./usePlanningState";

interface TeamPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
}

function uniqueId(nom: string, prenom: string, existing: Employee[]): string {
  const base = slugify(`${nom}-${prenom}`) || "membre";
  let id = base;
  let i = 2;
  while (existing.some((e) => e.id === id)) {
    id = `${base}-${i}`;
    i += 1;
  }
  return id;
}

function formatBirthday(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntilNextBirthday(iso: string): number {
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [, mm, dd] = iso.split("-").map(Number);
  let next = Date.UTC(now.getFullYear(), mm - 1, dd);
  if (next < todayUTC) next = Date.UTC(now.getFullYear() + 1, mm - 1, dd);
  return Math.round((next - todayUTC) / 86400000);
}

export default function TeamPage({ state, setState }: TeamPageProps) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [role, setRole] = useState("Développeur");

  function updateEmployee(id: string, patch: Partial<Employee>) {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function addEmployee() {
    if (!nom.trim() || !prenom.trim()) return;
    setState((prev) => {
      const id = uniqueId(nom, prenom, prev.employees);
      const employee: Employee = { id, nom: nom.trim(), prenom: prenom.trim(), role: role.trim() || "Développeur", active: true };
      return { ...prev, employees: [...prev.employees, employee] };
    });
    setNom("");
    setPrenom("");
    setRole("Développeur");
  }

  function removeEmployee(emp: Employee) {
    if (!confirm(`Supprimer ${fullName(emp)} et toutes ses données de planning ?`)) return;
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== emp.id),
      days: prev.days.filter((d) => d.employeeId !== emp.id),
    }));
  }

  const upcomingBirthdays = state.employees
    .filter((e) => e.birthday)
    .map((e) => ({ emp: e, days: daysUntilNextBirthday(e.birthday!) }))
    .sort((a, b) => a.days - b.days);

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Équipe</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Ajoutez, modifiez ou retirez des membres de l'équipe et renseignez leur date d'anniversaire.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1100 }}>
        <div className="panel">
          <h2 className="panel-title">Ajouter un membre</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Nom
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="LABBE" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Prénom
              <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Christelle" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Rôle
              <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Développeur" />
            </label>
            <button className="btn-primary" onClick={addEmployee} disabled={!nom.trim() || !prenom.trim()}>
              Ajouter
            </button>
          </div>
        </div>

        {upcomingBirthdays.length > 0 && (
          <div className="panel">
            <h2 className="panel-title">Prochains anniversaires</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingBirthdays.map(({ emp, days }) => (
                <li key={emp.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#334155" }}>
                  <span>{fullName(emp)}</span>
                  <span style={{ color: "#64748b" }}>
                    {formatBirthday(emp.birthday!)} · {days === 0 ? "aujourd'hui !" : `dans ${days} j`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="panel" style={{ overflowX: "auto" }}>
          <h2 className="panel-title">Membres ({state.employees.length})</h2>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                {["Nom", "Prénom", "Rôle", "Anniversaire", "Actif", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input className="input" value={emp.nom} onChange={(e) => updateEmployee(emp.id, { nom: e.target.value })} />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input className="input" value={emp.prenom} onChange={(e) => updateEmployee(emp.id, { prenom: e.target.value })} />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input className="input" value={emp.role} onChange={(e) => updateEmployee(emp.id, { role: e.target.value })} />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input
                      className="input"
                      type="date"
                      value={emp.birthday ?? ""}
                      onChange={(e) => updateEmployee(emp.id, { birthday: e.target.value || undefined })}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input
                      type="checkbox"
                      checked={emp.active}
                      onChange={(e) => updateEmployee(emp.id, { active: e.target.checked })}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <button className="btn-ghost" onClick={() => removeEmployee(emp)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
