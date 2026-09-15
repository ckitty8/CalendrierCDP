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
  const [tab, setTab] = useState<string>("projets");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [role, setRole] = useState<string>(ROLES[2]);
  const [projectNom, setProjectNom] = useState("");
  const [projectMethode, setProjectMethode] = useState(METHODES[1]);
  const [projectCapaciteSprint, setProjectCapaciteSprint] = useState(true);
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

  useEffect(() => {
    if (tab !== "projets" && !draftProjects.some((p) => p.id === tab)) setTab("projets");
  }, [draftProjects, tab]);

  function editEmployee(id: string, patch: Partial<Employee>) {
    setDraftEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDirty(true);
  }

  function toggleActive(emp: Employee) {
    const next = draftEmployees.map((e) => (e.id === emp.id ? { ...e, active: !e.active } : e));
    setDraftEmployees(next);
    setState((prev) => ({ ...prev, employees: next }));
  }

  function saveAll() {
    setState((prev) => ({ ...prev, employees: draftEmployees, projects: draftProjects }));
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function addEmployeeToProject(projectId: string) {
    if (!nom.trim() || !prenom.trim()) return;
    const id = uniqueId(`${nom}-${prenom}`, draftEmployees.map((e) => e.id), "membre");
    const employee: Employee = { id, nom: nom.trim(), prenom: prenom.trim(), role, active: true, projectIds: [projectId] };
    const next = [...draftEmployees, employee];
    setDraftEmployees(next);
    setState((prev) => ({ ...prev, employees: next }));
    setNom("");
    setPrenom("");
    setRole(ROLES[2]);
  }

  function removeEmployeeFromProject(emp: Employee, projectId: string) {
    const next = draftEmployees.map((e) =>
      e.id === emp.id ? { ...e, projectIds: e.projectIds.filter((id) => id !== projectId) } : e
    );
    setDraftEmployees(next);
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === emp.id ? { ...e, projectIds: e.projectIds.filter((id) => id !== projectId) } : e
      ),
    }));
  }

  function removeEmployeeCompletely(emp: Employee) {
    if (!confirm(`Supprimer définitivement ${fullName(emp)} et toutes ses données de planning ?`)) return;
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
    const project: Project = { id, nom: projectNom.trim(), methode: projectMethode, capaciteSprint: projectCapaciteSprint };
    const next = [...draftProjects, project];
    setDraftProjects(next);
    setState((prev) => ({ ...prev, projects: next }));
    setProjectNom("");
    setProjectMethode(METHODES[1]);
    setProjectCapaciteSprint(true);
    setTab(id);
  }

  function removeProject(project: Project) {
    if (!confirm(`Supprimer l'équipe "${project.nom}" ? Elle sera retirée des collaborateurs assignés.`)) return;
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

  const currentProject = draftProjects.find((p) => p.id === tab);
  const projectMembers = currentProject ? draftEmployees.filter((e) => e.projectIds.includes(currentProject.id)) : [];
  const upcomingBirthdays = projectMembers
    .filter((e) => e.birthday)
    .map((e) => ({ emp: e, days: daysUntilNextBirthday(e.birthday!) }))
    .sort((a, b) => a.days - b.days);

  return (
    <div>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Administration</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 13 }}>
            Créez une équipe, puis gérez ses membres dans l'onglet qui lui correspond.
          </p>
        </div>
        <button className={dirty ? "btn-primary" : "btn-ghost"} onClick={saveAll} disabled={!dirty}>
          {savedFlash ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {[{ key: "projets", label: `Équipes${draftProjects.length > 0 ? ` (${draftProjects.length})` : ""}` }, ...draftProjects.map((p) => ({
          key: p.id,
          label: `${p.nom} (${draftEmployees.filter((e) => e.projectIds.includes(p.id)).length})`,
        }))].map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                background: "none",
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
                cursor: "pointer",
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "projets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200 }}>
          <div className="panel">
            <h2 className="panel-title">Ajouter une équipe</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                Nom de l'équipe
                <input className="input" value={projectNom} onChange={(e) => setProjectNom(e.target.value)} placeholder="Équipe Front" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                Méthode
                <select className="input" value={projectMethode} onChange={(e) => setProjectMethode(e.target.value as Project["methode"])}>
                  {METHODES.map((m) => (
                    <option key={m} value={m}>
                      {METHODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)", paddingBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={projectCapaciteSprint}
                  onChange={(e) => setProjectCapaciteSprint(e.target.checked)}
                />
                Capacité de sprint
              </label>
              <button className="btn-primary" onClick={addProject} disabled={!projectNom.trim()}>
                Ajouter
              </button>
            </div>

            {draftProjects.length === 0 ? (
              <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--muted-foreground)" }}>
                Aucune équipe pour le moment — créez-en une pour faire apparaître son onglet de membres.
              </p>
            ) : (
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
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
                      <input
                        type="checkbox"
                        checked={project.capaciteSprint}
                        onChange={(e) => editProject(project.id, { capaciteSprint: e.target.checked })}
                      />
                      Capacité de sprint
                    </label>
                    <button className="btn-ghost" onClick={() => setTab(project.id)}>
                      Voir les membres
                    </button>
                    <button className="btn-ghost" onClick={() => removeProject(project)}>
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {currentProject && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200 }}>
          <div className="panel">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <h2 className="panel-title" style={{ marginBottom: 0 }}>
                Ajouter un membre à "{currentProject.nom}"
              </h2>
              <button className="btn-ghost" onClick={() => removeProject(currentProject)}>
                Supprimer l'équipe
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                Nom
                <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="LABBE" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                Prénom
                <input className="input" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Christelle" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                Rôle
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" onClick={() => addEmployeeToProject(currentProject.id)} disabled={!nom.trim() || !prenom.trim()}>
                Ajouter
              </button>
            </div>
          </div>

          {upcomingBirthdays.length > 0 && (
            <div className="panel">
              <h2 className="panel-title">Prochains anniversaires</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {upcomingBirthdays.map(({ emp, days }) => (
                  <li key={emp.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--foreground)" }}>
                    <span>{fullName(emp)}</span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {formatBirthday(emp.birthday!)} · {days === 0 ? "aujourd'hui !" : `dans ${days} j`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel" style={{ overflowX: "auto", paddingBottom: 28 }}>
            <h2 className="panel-title">
              Membres ({projectMembers.length}){dirty && <span style={{ color: "#b45309", fontWeight: 600, marginLeft: 8 }}>· modifications non enregistrées</span>}
            </h2>
            {projectMembers.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>Aucun membre pour le moment — ajoutez-en un ci-dessus.</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Nom", "Prénom", "Rôle", "Anniversaire", "Actif", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectMembers.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                        <input className="input" value={emp.nom} onChange={(e) => editEmployee(emp.id, { nom: e.target.value })} />
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                        <input className="input" value={emp.prenom} onChange={(e) => editEmployee(emp.id, { prenom: e.target.value })} />
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                        <select className="input" value={emp.role} onChange={(e) => editEmployee(emp.id, { role: e.target.value })}>
                          {!ROLES.includes(emp.role as (typeof ROLES)[number]) && <option value={emp.role}>{emp.role}</option>}
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                        <input
                          className="input"
                          type="date"
                          value={emp.birthday ?? ""}
                          onChange={(e) => editEmployee(emp.id, { birthday: e.target.value || undefined })}
                        />
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
                        <button
                          onClick={() => toggleActive(emp)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer",
                            background: emp.active ? "color-mix(in oklch, var(--conge-valide), white 85%)" : "var(--muted)",
                            color: emp.active ? "color-mix(in oklch, var(--conge-valide), black 45%)" : "var(--muted-foreground)",
                          }}
                        >
                          {emp.active ? "Actif" : "Inactif"}
                        </button>
                      </td>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        <button className="btn-ghost" onClick={() => removeEmployeeFromProject(emp, currentProject.id)}>
                          Retirer de l'équipe
                        </button>
                        <button className="btn-ghost" style={{ marginLeft: 6 }} onClick={() => removeEmployeeCompletely(emp)}>
                          Supprimer définitivement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
