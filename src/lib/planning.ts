import { supabase } from "@/integrations/supabase/client";

export type Equipe = { id: string; nom: string; couleur: string };
export type Projet = { id: string; equipe_id: string; nom: string };
export type Membre = {
  id: string;
  equipe_id: string;
  projet_id: string | null;
  nom: string;
  role: string | null;
  jours_travailles_client: number | null;
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
export type Sprint = { id: string; nom: string; date_debut: string; date_fin: string; ordre: number };
export type TacheRepartition = { id: string; nom: string; pourcentage: number; ordre: number };

export type TypeAbsence =
  | "non_classe"
  | "conge_valide"
  | "conge_previsionnel"
  | "absent_projet"
  | "teletravail"
  | "formation";

// "non_classe" est le type par défaut d'une valeur tapée directement dans une
// case, avant d'être classée (couleur) via un clic sur "Congé validé" ou
// "Congé non validé" — volontairement sans couleur dans TYPES_ABSENCE.
export const TYPES_ABSENCE: { value: TypeAbsence; label: string; couleur: string }[] = [
  { value: "conge_valide", label: "Congé validé", couleur: "var(--conge-valide)" },
  { value: "conge_previsionnel", label: "Congé non validé", couleur: "var(--conge-prev)" },
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

export const MOIS_COURTS = [
  "Janv",
  "Fév",
  "Mars",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc",
];

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

// Valeur d'une journée : celle saisie si elle existe, sinon présence pleine
// (1) par défaut — sauf un jour férié/fermeture sans saisie, compté non
// travaillé (0) dans les totaux.
export function valeurEffective(saisieValeur: number | undefined, estJourSpecial: boolean) {
  if (saisieValeur !== undefined) return saisieValeur;
  return estJourSpecial ? 0 : 1;
}

// Case vide = valeur par défaut du jour (aucune ligne en base) : travaillé
// pour un jour normal, non travaillé (congé) pour un jour férié/fermeture.
// 0 = congé, 0,5 = demi-journée. Un jour férié/fermeture reste modifiable
// comme n'importe quel autre jour, y compris pour le marquer travaillé.
export async function enregistrerJour(
  membre_id: string,
  date: string,
  valeur: number,
  type: TypeAbsence,
  estJourSpecial = false,
) {
  const estValeurParDefaut = estJourSpecial ? valeur === 0 : valeur >= 1;
  if (estValeurParDefaut) {
    const { error } = await supabase.from("jours").delete().eq("membre_id", membre_id).eq("date", date);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("jours")
    .upsert({ membre_id, date, valeur, type }, { onConflict: "membre_id,date" });
  if (error) throw error;
}

export async function enregistrerJoursTravaillesClient(membre_id: string, valeur: number | null) {
  const { error } = await supabase.from("membres").update({ jours_travailles_client: valeur }).eq("id", membre_id);
  if (error) throw error;
}

export async function chargerSprints() {
  const { data, error } = await supabase.from("sprints").select("*").order("ordre");
  if (error) throw error;
  return (data ?? []) as Sprint[];
}

export async function ajouterSprint(sprint: { nom: string; date_debut: string; date_fin: string; ordre: number }) {
  const { data, error } = await supabase.from("sprints").insert(sprint).select().single();
  if (error) throw error;
  return data as Sprint;
}

export async function modifierSprint(
  id: string,
  champs: Partial<Pick<Sprint, "nom" | "date_debut" | "date_fin">>,
) {
  const { error } = await supabase.from("sprints").update(champs).eq("id", id);
  if (error) throw error;
}

export async function supprimerSprint(id: string) {
  const { error } = await supabase.from("sprints").delete().eq("id", id);
  if (error) throw error;
}

export async function chargerRepartitionTaches() {
  const { data, error } = await supabase.from("repartition_taches").select("*").order("ordre");
  if (error) throw error;
  return (data ?? []) as TacheRepartition[];
}

export async function modifierPourcentageTache(id: string, pourcentage: number) {
  const { error } = await supabase.from("repartition_taches").update({ pourcentage }).eq("id", id);
  if (error) throw error;
}

// Nombre de jours ouvrés (hors week-ends et jours fériés/fermeture) sur une
// période [dateDebut, dateFin] incluse.
export function joursOuvresPeriode(dateDebut: string, dateFin: string, speciaux: Pick<JourSpecial, "date">[]) {
  const joursSpeciaux = new Set(speciaux.map((s) => s.date));
  let n = 0;
  const curseur = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(`${dateFin}T00:00:00`);
  while (curseur <= fin) {
    const d = iso(curseur.getFullYear(), curseur.getMonth(), curseur.getDate());
    if (!estWeekend(curseur.getDay()) && !joursSpeciaux.has(d)) n++;
    curseur.setDate(curseur.getDate() + 1);
  }
  return n;
}

export type DetailCapacite = { joursOuvres: number; congesValides: number; capacite: number };

// Capacité d'une personne sur une période (ex. un sprint) : jours ouvrés de
// la période, moins les congés validés (type "conge_valide") saisis dans le
// planning sur cette même période.
export function calculerCapacite(
  membreId: string,
  dateDebut: string,
  dateFin: string,
  jours: Pick<Jour, "membre_id" | "date" | "valeur" | "type">[],
  speciaux: Pick<JourSpecial, "date">[],
): DetailCapacite {
  const joursOuvres = joursOuvresPeriode(dateDebut, dateFin, speciaux);
  let congesValides = 0;
  for (const j of jours) {
    if (j.membre_id !== membreId) continue;
    if (j.type !== "conge_valide") continue;
    if (j.date < dateDebut || j.date > dateFin) continue;
    congesValides += 1 - Number(j.valeur);
  }
  return { joursOuvres, congesValides, capacite: joursOuvres - congesValides };
}
