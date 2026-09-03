import { useEffect, useState } from "react";
import type { Employee, Project } from "./types";
import { METHODES, METHODE_LABELS, ROLES, fullName, uniqueId } from "./lib";
import type { PlanningState } from "./usePlanningState";

interface TeamPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
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
  const [role, setRole] = useState<string>(ROLES[2]);
  const [projectNom, setProjectNom] = useState("");
  const [projectMethode, setProjectMethode] = useState(METHODES[1]);
  const [draftEmployees, setDraftEmployees] = useState<Employee[]>(state.employees);
  const [draftProjects, setDraftProjects] = useState<Project[]>(state.projects);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!dirty) setDraftEmployees(state.employees);
  }, [state.employees, dirty]);

  useEffect(() => {
    if (!dirty) setDraftProjects(state.projects);
  }, [state.projects, dirty]);

  function editEmployee(id: string, patch: Partial<Employee>) {
    setDraftEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDirty(true);
  }

  function toggleActive(emp: Employee) {
    const next = draftEmployees.map((e) => (e.id === emp.id ? { ...e, active: !e.active } : e));
    setDraftEmployees(next);
    setState((prev) => ({ ...prev, employees: next }));
  }

  function toggleEmployeeProject(emp: Employee, projectId: string) {
    const has = emp.projectIds.includes(projectId);
    const projectIds = has ? emp.projectIds.filter((id) => id !== projectId) : [...emp.projectIds, projectId];
    editEmployee(emp.id, { projectIds });
  }

  function saveAll() {
    setState((prev) => ({ ...prev, employees: draftEmployees, projects: draftProjects }));
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function addEmployee() {
    if (!nom.trim() || !prenom.trim()) return;
    const id = uniqueId(`${nom}-${prenom}`, draftEmployees.map((e) => e.id), "membre");
    const employee: Employee = { id, nom: nom.trim(), prenom: prenom.trim(), role, active: true, projectIds: [] };
    const next = [...draftEmployees, employee];
    setDraftEmployees(next);
    setState((prev) => ({ ...prev, employees: next }));
    setNom("");
    setPrenom("");
    setRole(ROLES[2]);
  }

  function removeEmployee(emp: Employee) {
    if (!confirm(`Supprimer ${fullName(emp)} et toutes ses données de planning ?`)) return;
    const next = draftEmployees.filter((e) => e.id !== emp.id);
    setDraftEmployees(next);
    setState((prev) => ({
      ...prev,
      employees: next,
      days: prev.days.filter((d) => d.employeeId !== emp.id),
    }));
  }

  function editProject(id: string, patch: Partial<Project>) {
    setDraftProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  function addProject() {
    if (!projectNom.trim()) return;
    const id = uniqueId(projectNom, draftProjects.map((p) => p.id), "projet");
    const project: Project = { id, nom: projectNom.trim(), methode: projectMethode };
    const next = [...draftProjects, project];
    setDraftProjects(next);
    setState((prev) => ({ ...prev, projects: next }));
    setProjectNom("");
    setProjectMethode(METHODES[1]);
  }

  function removeProject(project: Project) {
    if (!confirm(`Supprimer le projet "${project.nom}" ? Il sera retiré des collaborateurs assignés.`)) return;
    const nextProjects = draftProjects.filter((p) => p.id !== project.id);
    const nextEmployees = draftEmployees.map((e) => ({ ...e, projectIds: e.projectIds.filter((id) => id !== project.id) }));
    setDraftProjects(nextProjects);
    setDraftEmployees(nextEmployees);
    setState((prev) => ({
      ...prev,
      projects: nextProjects,
      employees: prev.employees.map((e) => ({ ...e, projectIds: e.projectIds.filter((id) => id !== project.id) })),
    }));
  }

  const upcomingBirthdays = draftEmployees
    .filter((e) => e.birthday)
    .map((e) => ({ emp: e, days: daysUntilNextBirthday(e.birthday!) }))
    .sort((a, b) => a.days - b.days);

  return (
    <div>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Équipe</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Ajoutez, modifiez ou retirez des membres et des projets, et renseignez leurs dates d'anniversaire.
          </p>
        </div>
        <button className={dirty ? "btn-primary" : "btn-ghost"} onClick={saveAll} disabled={!dirty}>
          {savedFlash ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200 }}>
        <div className="panel">
          <h2 className="panel-title">Ajouter un projet</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Nom du projet
              <input className="input" value={projectNom} onChange={(e) => setProjectNom(e.target.value)} placeholder="Refonte site web" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Méthode
              <select className="input" value={projectMethode} onChange={(e) => setProjectMethode(e.target.value as Project["methode"])}>
                {METHODES.map((m) => (
                  <option key={m} value={m}>
                    {METHODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn-primary" onClick={addProject} disabled={!projectNom.trim()}>
              Ajouter
            </button>
          </div>

          {draftProjects.length > 0 && (
            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {draftProjects.map((project) => (
                <li key={project.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    style={{ flex: "1 1 200px" }}
                    value={project.nom}
                    onChange={(e) => editProject(project.id, { nom: e.target.value })}
                  />
                  <select
                    className="input"
                    value={project.methode}
                    onChange={(e) => editProject(project.id, { methode: e.target.value as Project["methode"] })}
                  >
                    {METHODES.map((m) => (
                      <option key={m} value={m}>
                        {METHODE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                  <button className="btn-ghost" onClick={() => removeProject(project)}>
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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

        <div className="panel" style={{ overflowX: "auto", paddingBottom: 28 }}>
          <h2 className="panel-title">
            Membres ({draftEmployees.length}){dirty && <span style={{ color: "#b45309", fontWeight: 600, marginLeft: 8 }}>· modifications non enregistrées</span>}
          </h2>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                {["Nom", "Prénom", "Rôle", "Projets", "Anniversaire", "Actif", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draftEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input className="input" value={emp.nom} onChange={(e) => editEmployee(emp.id, { nom: e.target.value })} />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input className="input" value={emp.prenom} onChange={(e) => editEmployee(emp.id, { prenom: e.target.value })} />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <select className="input" value={emp.role} onChange={(e) => editEmployee(emp.id, { role: e.target.value })}>
                      {!ROLES.includes(emp.role as (typeof ROLES)[number]) && <option value={emp.role}>{emp.role}</option>}
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", minWidth: 180 }}>
                    {draftProjects.length === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>Aucun projet</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {draftProjects.map((project) => {
                          const on = emp.projectIds.includes(project.id);
                          return (
                            <button
                              key={project.id}
                              onClick={() => toggleEmployeeProject(emp, project.id)}
                              title={METHODE_LABELS[project.methode]}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 600,
                                border: on ? "1px solid #2569f5" : "1px solid #e2e8f0",
                                background: on ? "#eef2ff" : "#fff",
                                color: on ? "#2569f5" : "#94a3b8",
                                cursor: "pointer",
                              }}
                            >
                              {project.nom}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <input
                      className="input"
                      type="date"
                      value={emp.birthday ?? ""}
                      onChange={(e) => editEmployee(emp.id, { birthday: e.target.value || undefined })}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    <button
                      onClick={() => toggleActive(emp)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        background: emp.active ? "#ecfdf5" : "#f1f5f9",
                        color: emp.active ? "#047857" : "#64748b",
                      }}
                    >
                      {emp.active ? "Actif" : "Inactif"}
                    </button>
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
