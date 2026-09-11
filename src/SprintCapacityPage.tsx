import { Fragment, useEffect, useMemo, useState } from "react";
import type { DayEntry, Hotfix, Sprint, TaskType } from "./types";
import { ROLES, fullName, travailleSurPeriode, uniqueId } from "./lib";
import type { PlanningState } from "./usePlanningState";

/** Rôles qui comptent dans la capacité de sprint (fichier source : seuls les développeurs sont dénombrés, pas le Responsable/PO). */
const ROLES_CAPACITE: string[] = [ROLES[2], ROLES[3]]; // "Développeur", "Développeur stagiaire"

function reelKey(sprintId: string, taskId: string): string {
  return `${sprintId}__${taskId}`;
}

function sprintLabel(sprint: Sprint): string {
  return sprint.version.trim() ? `${sprint.nom} (${sprint.version.trim()})` : sprint.nom;
}

interface SprintCapacityPageProps {
  state: PlanningState;
  setState: (updater: (prev: PlanningState) => PlanningState) => void;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtPct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

export default function SprintCapacityPage({ state, setState }: SprintCapacityPageProps) {
  const [draftSprints, setDraftSprints] = useState<Sprint[]>(state.sprints);
  const [draftTaskTypes, setDraftTaskTypes] = useState<TaskType[]>(state.taskTypes);
  const [draftReelJH, setDraftReelJH] = useState<Record<string, number>>(state.reelJH);
  const [draftHotfixes, setDraftHotfixes] = useState<Hotfix[]>(state.hotfixes);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [newTaskNom, setNewTaskNom] = useState("");
  const [newHotfixTitre, setNewHotfixTitre] = useState("");
  const [newHotfixVersion, setNewHotfixVersion] = useState("");

  useEffect(() => {
    if (!dirty) setDraftSprints(state.sprints);
  }, [state.sprints, dirty]);

  useEffect(() => {
    if (!dirty) setDraftTaskTypes(state.taskTypes);
  }, [state.taskTypes, dirty]);

  useEffect(() => {
    if (!dirty) setDraftReelJH(state.reelJH);
  }, [state.reelJH, dirty]);

  useEffect(() => {
    if (!dirty) setDraftHotfixes(state.hotfixes);
  }, [state.hotfixes, dirty]);

  const employees = useMemo(() => {
    const projetsAvecCapacite = new Set(state.projects.filter((p) => p.capaciteSprint).map((p) => p.id));
    return state.employees.filter(
      (e) => e.active && ROLES_CAPACITE.includes(e.role) && e.projectIds.some((id) => projetsAvecCapacite.has(id))
    );
  }, [state.employees, state.projects]);

  const dayIndex = useMemo(() => {
    const m = new Map<string, DayEntry>();
    for (const d of state.days) m.set(`${d.employeeId}|${d.date}`, d);
    return m;
  }, [state.days]);

  const sprints = useMemo(
    () => [...draftSprints].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
    [draftSprints]
  );

  // Jours de travail par collaborateur et par sprint, calculés automatiquement depuis le Planning.
  const travailPar = useMemo(() => {
    const map = new Map<string, number>(); // clé "sprintId|employeeId"
    for (const sprint of sprints) {
      for (const emp of employees) {
        map.set(`${sprint.id}|${emp.id}`, travailleSurPeriode(emp.id, sprint.dateDebut, sprint.dateFin, dayIndex));
      }
    }
    return map;
  }, [sprints, employees, dayIndex]);

  const totalEquipePar = useMemo(() => {
    const map = new Map<string, number>();
    for (const sprint of sprints) {
      let total = 0;
      for (const emp of employees) total += travailPar.get(`${sprint.id}|${emp.id}`) ?? 0;
      map.set(sprint.id, total);
    }
    return map;
  }, [sprints, employees, travailPar]);

  const sommePourcentages = draftTaskTypes.reduce((s, t) => s + t.pourcentage, 0);
  const pourcentageUS = 1 - sommePourcentages;

  // Tâche "US" + tâches définies, avec leur % — sert au calcul de l'Estimé du suivi réel.
  const allTasks = useMemo<TaskType[]>(
    () => [{ id: "us", nom: "US", pourcentage: pourcentageUS }, ...draftTaskTypes],
    [pourcentageUS, draftTaskTypes]
  );

  function estime(sprintId: string, task: TaskType): number {
    return (totalEquipePar.get(sprintId) ?? 0) * task.pourcentage;
  }

  function addSprint() {
    const n = draftSprints.length + 1;
    const id = uniqueId(`sprint-${n}`, draftSprints.map((s) => s.id), "sprint");
    const sprint: Sprint = { id, nom: `Sprint ${n}`, dateDebut: "", dateFin: "", version: "" };
    const next = [...draftSprints, sprint];
    setDraftSprints(next);
    setState((prev) => ({ ...prev, sprints: next }));
  }

  function editSprint(id: string, patch: Partial<Sprint>) {
    setDraftSprints((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  }

  function removeSprint(sprint: Sprint) {
    if (!confirm(`Supprimer "${sprint.nom}" ?`)) return;
    const next = draftSprints.filter((s) => s.id !== sprint.id);
    const nextReel = Object.fromEntries(Object.entries(draftReelJH).filter(([k]) => !k.startsWith(`${sprint.id}__`)));
    setDraftSprints(next);
    setDraftReelJH(nextReel);
    setState((prev) => ({
      ...prev,
      sprints: next,
      reelJH: Object.fromEntries(Object.entries(prev.reelJH).filter(([k]) => !k.startsWith(`${sprint.id}__`))),
    }));
  }

  function editTaskType(id: string, patch: Partial<TaskType>) {
    setDraftTaskTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  }

  function addTaskType() {
    if (!newTaskNom.trim()) return;
    const id = uniqueId(newTaskNom, draftTaskTypes.map((t) => t.id), "tache");
    const task: TaskType = { id, nom: newTaskNom.trim(), pourcentage: 0 };
    const next = [...draftTaskTypes, task];
    setDraftTaskTypes(next);
    setState((prev) => ({ ...prev, taskTypes: next }));
    setNewTaskNom("");
  }

  function removeTaskType(task: TaskType) {
    if (!confirm(`Supprimer la tâche "${task.nom}" ?`)) return;
    const next = draftTaskTypes.filter((t) => t.id !== task.id);
    const nextReel = Object.fromEntries(Object.entries(draftReelJH).filter(([k]) => !k.endsWith(`__${task.id}`)));
    setDraftTaskTypes(next);
    setDraftReelJH(nextReel);
    setState((prev) => ({
      ...prev,
      taskTypes: next,
      reelJH: Object.fromEntries(Object.entries(prev.reelJH).filter(([k]) => !k.endsWith(`__${task.id}`))),
    }));
  }

  function editReel(sprintId: string, taskId: string, value: number) {
    setDraftReelJH((prev) => ({ ...prev, [reelKey(sprintId, taskId)]: value }));
    setDirty(true);
  }

  function addHotfix() {
    if (!newHotfixTitre.trim()) return;
    const id = uniqueId(`${newHotfixTitre}-${draftHotfixes.length + 1}`, draftHotfixes.map((h) => h.id), "hotfix");
    const hotfix: Hotfix = {
      id,
      titre: newHotfixTitre.trim(),
      version: newHotfixVersion.trim(),
      date: new Date().toISOString().slice(0, 10),
      statut: "ouvert",
    };
    const next = [hotfix, ...draftHotfixes];
    setDraftHotfixes(next);
    setState((prev) => ({ ...prev, hotfixes: next }));
    setNewHotfixTitre("");
    setNewHotfixVersion("");
  }

  function editHotfix(id: string, patch: Partial<Hotfix>) {
    setDraftHotfixes((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setDirty(true);
  }

  function toggleHotfixStatut(hotfix: Hotfix) {
    const next = draftHotfixes.map((h) =>
      h.id === hotfix.id ? { ...h, statut: h.statut === "ouvert" ? ("deploye" as const) : ("ouvert" as const) } : h
    );
    setDraftHotfixes(next);
    setState((prev) => ({ ...prev, hotfixes: next }));
  }

  function removeHotfix(hotfix: Hotfix) {
    if (!confirm(`Supprimer le hotfix "${hotfix.titre}" ?`)) return;
    const next = draftHotfixes.filter((h) => h.id !== hotfix.id);
    setDraftHotfixes(next);
    setState((prev) => ({ ...prev, hotfixes: next }));
  }

  function saveAll() {
    setState((prev) => ({
      ...prev,
      sprints: draftSprints,
      taskTypes: draftTaskTypes,
      reelJH: draftReelJH,
      hotfixes: draftHotfixes,
    }));
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const cellStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "center", borderBottom: "1px solid #f1f5f9" };
  const headStyle: React.CSSProperties = { padding: "6px 8px", textAlign: "center", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, whiteSpace: "nowrap" };

  return (
    <div>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Capacité de sprint</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
            Définissez vos sprints (dates de début/fin) : les jours de travail par collaborateur sont calculés
            automatiquement depuis le Planning. Répartissez ensuite la capacité de l'équipe en JH par type de tâche.
          </p>
        </div>
        <button className={dirty ? "btn-primary" : "btn-ghost"} onClick={saveAll} disabled={!dirty}>
          {savedFlash ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="panel">
          <h2 className="panel-title">
            Sprints ({draftSprints.length}){dirty && <span style={{ color: "#b45309", fontWeight: 600, marginLeft: 8 }}>· modifications non enregistrées</span>}
          </h2>
          {draftSprints.length === 0 && <p style={{ margin: "0 0 10px", fontSize: 13, color: "#94a3b8" }}>Aucun sprint pour le moment.</p>}
          {draftSprints.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
              {draftSprints.map((sprint) => (
                <div key={sprint.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <input
                    className="input"
                    style={{ flex: "1 1 160px" }}
                    value={sprint.nom}
                    onChange={(e) => editSprint(sprint.id, { nom: e.target.value })}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                    Début
                    <input
                      className="input"
                      type="date"
                      value={sprint.dateDebut}
                      onChange={(e) => editSprint(sprint.id, { dateDebut: e.target.value })}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                    Fin
                    <input
                      className="input"
                      type="date"
                      value={sprint.dateFin}
                      onChange={(e) => editSprint(sprint.id, { dateFin: e.target.value })}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                    Version
                    <input
                      className="input"
                      style={{ width: 110 }}
                      placeholder="v1.2.0"
                      value={sprint.version}
                      onChange={(e) => editSprint(sprint.id, { version: e.target.value })}
                    />
                  </label>
                  <button className="btn-ghost" onClick={() => removeSprint(sprint)}>
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="btn-secondary" onClick={addSprint}>
            + Ajouter un sprint
          </button>
        </div>

        {sprints.length > 0 && employees.length > 0 && (
          <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
            <h2 className="panel-title">Jours de travail par sprint</h2>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
              Seuls les rôles "Développeur" et "Développeur stagiaire" comptent dans la capacité (le Responsable/PO n'est
              pas décompté), et seulement s'ils sont sur un projet où la case "Capacité de sprint" est cochée (page
              Administration).
            </p>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "left" }}>Collaborateur</th>
                  {sprints.map((s) => (
                    <th key={s.id} style={headStyle}>
                      {sprintLabel(s)}
                    </th>
                  ))}
                  <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const total = sprints.reduce((s, sprint) => s + (travailPar.get(`${sprint.id}|${emp.id}`) ?? 0), 0);
                  return (
                    <tr key={emp.id}>
                      <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {fullName(emp)}
                      </td>
                      {sprints.map((sprint) => (
                        <td key={sprint.id} style={cellStyle}>
                          {fmt(travailPar.get(`${sprint.id}|${emp.id}`) ?? 0)}
                        </td>
                      ))}
                      <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>{fmt(total)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ padding: "6px 8px", fontWeight: 700 }}>Total équipe</td>
                  {sprints.map((sprint) => (
                    <td key={sprint.id} style={{ ...cellStyle, fontWeight: 700 }}>
                      {fmt(totalEquipePar.get(sprint.id) ?? 0)}
                    </td>
                  ))}
                  <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                    {fmt([...totalEquipePar.values()].reduce((a, b) => a + b, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {sprints.length > 0 && employees.length > 0 && (
          <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
            <h2 className="panel-title">Répartition des tâches (JH par sprint)</h2>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
              "US" (fonctionnalités) récupère automatiquement le reste des JH de l'équipe une fois les autres tâches
              affectées. Modifiez le % de chaque tâche ou ajoutez-en une nouvelle.
            </p>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "left" }}>Tâche</th>
                  <th style={headStyle}>%</th>
                  {sprints.map((s) => (
                    <th key={s.id} style={headStyle}>
                      {sprintLabel(s)}
                    </th>
                  ))}
                  <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Total</th>
                  <th style={headStyle}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>US</td>
                  <td style={{ ...cellStyle, fontWeight: 600, color: pourcentageUS < 0 ? "#dc2626" : "#334155" }}>
                    {fmtPct(pourcentageUS)}
                  </td>
                  {sprints.map((sprint) => {
                    const totalSprint = totalEquipePar.get(sprint.id) ?? 0;
                    return (
                      <td key={sprint.id} style={cellStyle}>
                        {fmt(totalSprint * pourcentageUS)}
                      </td>
                    );
                  })}
                  <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>
                    {fmt(sprints.reduce((s, sprint) => s + (totalEquipePar.get(sprint.id) ?? 0) * pourcentageUS, 0))}
                  </td>
                  <td style={cellStyle}></td>
                </tr>
                {draftTaskTypes.map((task) => (
                  <tr key={task.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <input
                        className="input"
                        style={{ minWidth: 140 }}
                        value={task.nom}
                        onChange={(e) => editTaskType(task.id, { nom: e.target.value })}
                      />
                    </td>
                    <td style={{ ...cellStyle, padding: "4px 8px" }}>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        max={100}
                        style={{ width: 64, textAlign: "right" }}
                        value={Math.round(task.pourcentage * 1000) / 10}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v)) editTaskType(task.id, { pourcentage: v / 100 });
                        }}
                      />
                    </td>
                    {sprints.map((sprint) => {
                      const totalSprint = totalEquipePar.get(sprint.id) ?? 0;
                      return (
                        <td key={sprint.id} style={cellStyle}>
                          {fmt(totalSprint * task.pourcentage)}
                        </td>
                      );
                    })}
                    <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>
                      {fmt(sprints.reduce((s, sprint) => s + (totalEquipePar.get(sprint.id) ?? 0) * task.pourcentage, 0))}
                    </td>
                    <td style={cellStyle}>
                      <button className="btn-ghost" onClick={() => removeTaskType(task)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "6px 8px", fontWeight: 700 }}>Total équipe</td>
                  <td style={{ ...cellStyle, fontWeight: 700 }}>{fmtPct(pourcentageUS + sommePourcentages)}</td>
                  {sprints.map((sprint) => (
                    <td key={sprint.id} style={{ ...cellStyle, fontWeight: 700 }}>
                      {fmt(totalEquipePar.get(sprint.id) ?? 0)}
                    </td>
                  ))}
                  <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                    {fmt([...totalEquipePar.values()].reduce((a, b) => a + b, 0))}
                  </td>
                  <td style={cellStyle}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <input
                className="input"
                placeholder="Nouvelle tâche"
                value={newTaskNom}
                onChange={(e) => setNewTaskNom(e.target.value)}
              />
              <button className="btn-secondary" onClick={addTaskType} disabled={!newTaskNom.trim()}>
                + Ajouter une tâche
              </button>
            </div>
          </div>
        )}

        {sprints.length > 0 && employees.length > 0 && (
          <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
            <h2 className="panel-title">Suivi réel — Estimé vs Réel (JH)</h2>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
              L'Estimé reprend la répartition ci-dessus. Saisissez le Réel (JH réellement passés) au fur et à mesure du
              sprint.
            </p>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "left" }}>Tâche</th>
                  <th style={{ ...headStyle, textAlign: "left" }}></th>
                  {sprints.map((s) => (
                    <th key={s.id} style={headStyle}>
                      {sprintLabel(s)}
                    </th>
                  ))}
                  <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Total</th>
                  <th style={{ ...headStyle, fontWeight: 700, color: "#1e3a8a", background: "#eff6ff" }}>Écart</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map((task) => {
                  const totalEstime = sprints.reduce((s, sprint) => s + estime(sprint.id, task), 0);
                  const totalReel = sprints.reduce((s, sprint) => s + (draftReelJH[reelKey(sprint.id, task.id)] ?? 0), 0);
                  const ecart = totalReel - totalEstime;
                  return (
                    <Fragment key={task.id}>
                      <tr>
                        <td rowSpan={2} style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 600, whiteSpace: "nowrap", verticalAlign: "top" }}>
                          {task.nom}
                        </td>
                        <td style={{ padding: "4px 8px", fontSize: 11, color: "#94a3b8" }}>Estimé</td>
                        {sprints.map((sprint) => (
                          <td key={sprint.id} style={{ ...cellStyle, color: "#64748b" }}>
                            {fmt(estime(sprint.id, task))}
                          </td>
                        ))}
                        <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc" }}>{fmt(totalEstime)}</td>
                        <td rowSpan={2} style={{ ...cellStyle, fontWeight: 700, verticalAlign: "middle", color: ecart > 0 ? "#dc2626" : ecart < 0 ? "#047857" : "#334155" }}>
                          {ecart > 0 ? "+" : ""}
                          {fmt(ecart)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "4px 8px", fontSize: 11, color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>Réel</td>
                        {sprints.map((sprint) => (
                          <td key={sprint.id} style={{ ...cellStyle, padding: "4px 8px" }}>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              style={{ width: 60, textAlign: "right" }}
                              value={draftReelJH[reelKey(sprint.id, task.id)] ?? 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isNaN(v)) editReel(sprint.id, task.id, v);
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>{fmt(totalReel)}</td>
                      </tr>
                    </Fragment>
                  );
                })}
                <tr>
                  <td colSpan={2} style={{ padding: "6px 8px", fontWeight: 700, color: "#64748b" }}>
                    TT tous sauf US (Réel)
                  </td>
                  {sprints.map((sprint) => {
                    const totalReelHorsUS = draftTaskTypes.reduce((s, t) => s + (draftReelJH[reelKey(sprint.id, t.id)] ?? 0), 0);
                    return (
                      <td key={sprint.id} style={{ ...cellStyle, fontWeight: 700, color: "#64748b" }}>
                        {fmt(totalReelHorsUS)}
                      </td>
                    );
                  })}
                  <td style={{ ...cellStyle, fontWeight: 700, background: "#f8fafc", color: "#64748b" }}>
                    {fmt(
                      sprints.reduce(
                        (s, sprint) => s + draftTaskTypes.reduce((s2, t) => s2 + (draftReelJH[reelKey(sprint.id, t.id)] ?? 0), 0),
                        0
                      )
                    )}
                  </td>
                  <td style={cellStyle}></td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: "6px 8px", fontWeight: 700 }}>
                    TT tout (Réel)
                  </td>
                  {sprints.map((sprint) => {
                    const totalReelSprint = allTasks.reduce((s, t) => s + (draftReelJH[reelKey(sprint.id, t.id)] ?? 0), 0);
                    return (
                      <td key={sprint.id} style={{ ...cellStyle, fontWeight: 700 }}>
                        {fmt(totalReelSprint)}
                      </td>
                    );
                  })}
                  <td style={{ ...cellStyle, fontWeight: 700, background: "#dbeafe" }}>
                    {fmt(
                      sprints.reduce(
                        (s, sprint) => s + allTasks.reduce((s2, t) => s2 + (draftReelJH[reelKey(sprint.id, t.id)] ?? 0), 0),
                        0
                      )
                    )}
                  </td>
                  <td style={cellStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="panel" style={{ overflowX: "auto", paddingBottom: 20 }}>
          <h2 className="panel-title">
            Hotfix ({draftHotfixes.length}){dirty && <span style={{ color: "#b45309", fontWeight: 600, marginLeft: 8 }}>· modifications non enregistrées</span>}
          </h2>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#94a3b8" }}>
            Suivez les correctifs urgents déployés en dehors du cycle normal, en les rattachant si besoin à un sprint/version.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Titre du hotfix
              <input
                className="input"
                style={{ minWidth: 220 }}
                value={newHotfixTitre}
                onChange={(e) => setNewHotfixTitre(e.target.value)}
                placeholder="Correctif erreur 500 sur export"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#475569" }}>
              Version
              <input
                className="input"
                style={{ width: 110 }}
                value={newHotfixVersion}
                onChange={(e) => setNewHotfixVersion(e.target.value)}
                placeholder="v1.2.1"
              />
            </label>
            <button className="btn-primary" onClick={addHotfix} disabled={!newHotfixTitre.trim()}>
              + Ajouter un hotfix
            </button>
          </div>

          {draftHotfixes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Aucun hotfix pour le moment.</p>
          ) : (
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...headStyle, textAlign: "left" }}>Titre</th>
                  <th style={headStyle}>Version</th>
                  <th style={headStyle}>Date</th>
                  <th style={headStyle}>Sprint lié</th>
                  <th style={headStyle}>Statut</th>
                  <th style={headStyle}></th>
                </tr>
              </thead>
              <tbody>
                {draftHotfixes.map((h) => (
                  <tr key={h.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <input
                        className="input"
                        style={{ minWidth: 200 }}
                        value={h.titre}
                        onChange={(e) => editHotfix(h.id, { titre: e.target.value })}
                      />
                    </td>
                    <td style={{ ...cellStyle, padding: "4px 6px" }}>
                      <input
                        className="input"
                        style={{ width: 90 }}
                        value={h.version}
                        onChange={(e) => editHotfix(h.id, { version: e.target.value })}
                      />
                    </td>
                    <td style={{ ...cellStyle, padding: "4px 6px" }}>
                      <input
                        className="input"
                        type="date"
                        value={h.date}
                        onChange={(e) => editHotfix(h.id, { date: e.target.value })}
                      />
                    </td>
                    <td style={{ ...cellStyle, padding: "4px 6px" }}>
                      <select
                        className="input"
                        value={h.sprintId ?? ""}
                        onChange={(e) => editHotfix(h.id, { sprintId: e.target.value || undefined })}
                      >
                        <option value="">—</option>
                        {draftSprints.map((s) => (
                          <option key={s.id} value={s.id}>
                            {sprintLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={() => toggleHotfixStatut(h)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          background: h.statut === "deploye" ? "#ecfdf5" : "#fff7ed",
                          color: h.statut === "deploye" ? "#047857" : "#c2410c",
                        }}
                      >
                        {h.statut === "deploye" ? "Déployé" : "Ouvert"}
                      </button>
                    </td>
                    <td style={cellStyle}>
                      <button className="btn-ghost" onClick={() => removeHotfix(h)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(sprints.length === 0 || employees.length === 0) && (
          <div className="panel">
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
              {employees.length === 0
                ? "Aucun collaborateur actif avec le rôle Développeur/Développeur stagiaire sur un projet avec \"Capacité de sprint\" coché — vérifiez la page Administration."
                : "Ajoutez au moins un sprint (dates de début et de fin) pour voir les calculs de capacité."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
