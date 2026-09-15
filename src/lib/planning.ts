import { supabase } from "@/integrations/supabase/client";

export type Equipe = { id: string; nom: string; couleur: string };
export type Projet = { id: string; equipe_id: string; nom: string };
export type Membre = {
  id: string;
  equipe_id: string;
  projet_id: string | null;
  nom: string;
  role: string | null;
};
export type Jour = {
  id: string;
  membre_id: string;
  date: string;
  valeur: number;
  type: TypeAbsence;
  commentaire: string | null;
};
export type JourSpecial = { id: string; date: string; libelle: string; type: string };

export type TypeAbsence =
  | "conge_valide"
  | "conge_previsionnel"
  | "absent_projet"
  | "teletravail"
  | "formation";

export const TYPES_ABSENCE: { value: TypeAbsence; label: string; couleur: string }[] = [
  { value: "conge_valide", label: "Congé validé", couleur: "var(--conge-valide)" },
  { value: "conge_previsionnel", label: "Congé prévisionnel", couleur: "var(--conge-prev)" },
  { value: "absent_projet", label: "Absent du projet", couleur: "var(--absent-projet)" },
  { value: "teletravail", label: "Télétravail", couleur: "var(--teletravail)" },
  { value: "formation", label: "Formation", couleur: "var(--formation)" },
];

export const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const JOURS_COURTS = ["D", "L", "M", "M", "J", "V", "S"];

export function iso(annee: number, mois: number, jour: number) {
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

export function joursDuMois(annee: number, mois: number) {
  const total = new Date(annee, mois + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(annee, mois, i + 1);
    return { jour: i + 1, date: iso(annee, mois, i + 1), dow: d.getDay() };
  });
}

export function estWeekend(dow: number) {
  return dow === 0 || dow === 6;
}

export async function chargerReferentiel() {
  const [equipes, projets, membres, speciaux] = await Promise.all([
    supabase.from("equipes").select("*").order("nom"),
    supabase.from("projets").select("*").order("nom"),
    supabase.from("membres").select("*").order("nom"),
    supabase.from("jours_speciaux").select("*"),
  ]);
  if (equipes.error) throw equipes.error;
  if (projets.error) throw projets.error;
  if (membres.error) throw membres.error;
  if (speciaux.error) throw speciaux.error;
  return {
    equipes: (equipes.data ?? []) as Equipe[],
    projets: (projets.data ?? []) as Projet[],
    membres: (membres.data ?? []) as Membre[],
    speciaux: (speciaux.data ?? []) as JourSpecial[],
  };
}

export async function chargerJours(annee: number) {
  const { data, error } = await supabase
    .from("jours")
    .select("*")
    .gte("date", `${annee}-01-01`)
    .lte("date", `${annee}-12-31`);
  if (error) throw error;
  return (data ?? []) as Jour[];
}

export async function enregistrerJour(
  membre_id: string,
  date: string,
  valeur: number,
  type: TypeAbsence,
) {
  if (valeur >= 1) {
    const { error } = await supabase.from("jours").delete().eq("membre_id", membre_id).eq("date", date);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("jours")
    .upsert({ membre_id, date, valeur, type }, { onConflict: "membre_id,date" });
  if (error) throw error;
}
