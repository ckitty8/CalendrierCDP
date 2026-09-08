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
}

export interface TaskType {
  id: string;
  nom: string;
  pourcentage: number; // fraction 0..1 (répartition JH d'un sprint)
}

/** Ligne du convertisseur heures -> JH ("barème vendeur" du fichier Excel). */
export interface BaremeEntry {
  id: string;
  reference: string;
  heures: number;
}
