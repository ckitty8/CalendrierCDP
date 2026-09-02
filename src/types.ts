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
