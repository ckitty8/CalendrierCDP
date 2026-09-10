export type DayValue = 0 | 0.5 | 1;

export type DayCategory =
  | "normal"
  | "ferie"
  | "fermeture"
  | "absent_projet"
  | "conge_previsionnel"
  | "conge_valide";

export interface DayEntry {
  employeeId: string;
  date: string; // ISO yyyy-mm-dd
  value: DayValue;
  category: DayCategory;
}

export interface Employee {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  active: boolean;
  birthday?: string; // ISO yyyy-mm-dd
  projectIds: string[];
}

export type Methode = "cycle_v" | "scrum" | "kanban";

export interface Project {
  id: string;
  nom: string;
  methode: Methode;
}

export interface Sprint {
  id: string;
  nom: string;
  dateDebut: string; // ISO yyyy-mm-dd
  dateFin: string; // ISO yyyy-mm-dd
  version: string; // nom/numéro de version associé au sprint
}

export type HotfixStatut = "ouvert" | "deploye";

export interface Hotfix {
  id: string;
  titre: string;
  version: string;
  date: string; // ISO yyyy-mm-dd
  statut: HotfixStatut;
  sprintId?: string;
  notes?: string;
}

export interface TaskType {
  id: string;
  nom: string;
  pourcentage: number; // fraction 0..1 (répartition JH d'un sprint)
}

/** Temps saisi par un collaborateur sur un projet, pour une journée donnée. */
export interface TimeEntry {
  id: string;
  employeeId: string;
  projectId: string;
  date: string; // ISO yyyy-mm-dd
  heures: number; // JH
}
