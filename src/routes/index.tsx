import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Settings2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import {
  chargerJours,
  chargerReferentiel,
  enregistrerJour,
  estWeekend,
  JOURS_COURTS,
  joursDuMois,
  MOIS,
  MOIS_COURTS,
  TYPES_ABSENCE,
  valeurEffective,
  type TypeAbsence,
} from "@/lib/planning";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planning DSI — congés des équipes" },
      {
        name: "description",
        content:
          "Planning partagé de la DSI : suivez les congés et présences des équipes CDO, VISTA et Talend, jour par jour.",
      },
      { property: "og:title", content: "Planning DSI — congés des équipes" },
      {
        property: "og:description",
        content: "Planning partagé des congés des équipes de la DSI.",
      },
    ],
  }),
  component: Planning,
});

const ANNEE_DEFAUT = 2026;

function Planning() {
  const queryClient = useQueryClient();
  const [annee, setAnnee] = useState(ANNEE_DEFAUT);
  const [mois, setMois] = useState(0);
  const [equipeFiltre, setEquipeFiltre] = useState<string>("toutes");
  const [typeSaisie, setTypeSaisie] = useState<TypeAbsence>("conge_valide");

  const referentiel = useQuery({ queryKey: ["referentiel"], queryFn: chargerReferentiel });
  const jours = useQuery({ queryKey: ["jours", annee], queryFn: () => chargerJours(annee) });

  const mutation = useMutation({
    mutationFn: (v: { membre_id: string; date: string; valeur: number; type: TypeAbsence }) =>
      enregistrerJour(v.membre_id, v.date, v.valeur, v.type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jours", annee] }),
    onError: (e: Error) => toast.error("Enregistrement impossible : " + e.message),
  });

  const colonnes = useMemo(() => joursDuMois(annee, mois), [annee, mois]);

  const speciaux = useMemo(() => {
    const map = new Map<string, { libelle: string; type: string }>();
    for (const s of referentiel.data?.speciaux ?? []) map.set(s.date, s);
    return map;
  }, [referentiel.data]);

  const saisies = useMemo(() => {
    const map = new Map<string, { valeur: number; type: TypeAbsence }>();
    for (const j of jours.data ?? []) map.set(`${j.membre_id}|${j.date}`, { valeur: Number(j.valeur), type: j.type });
    return map;
  }, [jours.data]);

  const equipes = referentiel.data?.equipes ?? [];
  const projets = referentiel.data?.projets ?? [];
  const membres = referentiel.data?.membres ?? [];

  const groupes = equipes
    .filter((e) => equipeFiltre === "toutes" || e.id === equipeFiltre)
    .map((e) => ({ equipe: e, membres: membres.filter((m) => m.equipe_id === e.id) }));

  // Congés du mois affiché, uniquement du lundi au vendredi. Un jour férié ou
  // de fermeture compte comme non travaillé par défaut (sauf saisie contraire).
  function congesMois(membreId: string) {
    let total = 0;
    for (const c of colonnes) {
      if (estWeekend(c.dow)) continue;
      const s = saisies.get(`${membreId}|${c.date}`);
      total += 1 - valeurEffective(s?.valeur, speciaux.has(c.date));
    }
    return total;
  }

  // Bilan mensuel travaillé/non travaillé par personne, du lundi au vendredi,
  // calculé à partir du planning : un jour férié/fermeture sans saisie compte
  // comme non travaillé, un jour normal sans saisie compte comme travaillé.
  const bilanAnnuel = useMemo(() => {
    const parMois = Array.from({ length: 12 }, (_, m) => joursDuMois(annee, m));
    const bilan = new Map<string, { parMois: { travaille: number; conges: number }[]; totalTravaille: number; totalConges: number }>();
    for (const m of membres) {
      const moisDetail = parMois.map((jours) => {
        let travaille = 0;
        let conges = 0;
        for (const c of jours) {
          if (estWeekend(c.dow)) continue;
          const s = saisies.get(`${m.id}|${c.date}`);
          const valeur = valeurEffective(s?.valeur, speciaux.has(c.date));
          travaille += valeur;
          conges += 1 - valeur;
        }
        return { travaille, conges };
      });
      bilan.set(m.id, {
        parMois: moisDetail,
        totalTravaille: moisDetail.reduce((s, x) => s + x.travaille, 0),
        totalConges: moisDetail.reduce((s, x) => s + x.conges, 0),
      });
    }
    return bilan;
  }, [annee, membres, saisies, speciaux]);

  // Total agrégé (toutes les personnes actuellement affichées, selon le filtre équipe).
  const totalGeneral = useMemo(() => {
    const parMois = Array.from({ length: 12 }, () => ({ travaille: 0, conges: 0 }));
    let totalTravaille = 0;
    let totalConges = 0;
    for (const { membres: liste } of groupes) {
      for (const m of liste) {
        const bilan = bilanAnnuel.get(m.id);
        if (!bilan) continue;
        bilan.parMois.forEach((mois, i) => {
          const cible = parMois[i];
          if (!cible) return;
          cible.travaille += mois.travaille;
          cible.conges += mois.conges;
        });
        totalTravaille += bilan.totalTravaille;
        totalConges += bilan.totalConges;
      }
    }
    return { parMois, totalTravaille, totalConges };
  }, [groupes, bilanAnnuel]);

  // Case vide = travaillé (défaut, aucune ligne en base) → demi-journée (0,5)
  // → congé (0) → retour à vide. Règle identique pour toutes les cases, y
  // compris les jours fériés/fermeture : aucune case n'est bloquée.
  function cycler(membreId: string, date: string) {
    const actuel = saisies.get(`${membreId}|${date}`);
    const valeur = actuel === undefined ? 0.5 : actuel.valeur === 0.5 ? 0 : 1;
    mutation.mutate({ membre_id: membreId, date, valeur, type: typeSaisie });
  }

  const naviguer = (delta: number) => {
    const m = mois + delta;
    if (m < 0) {
      setMois(11);
      setAnnee(annee - 1);
    } else if (m > 11) {
      setMois(0);
      setAnnee(annee + 1);
    } else setMois(m);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold tracking-tight">Planning DSI</h1>
            <p className="text-sm text-muted-foreground">
              Congés et présences de toutes les équipes
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/equipes">
              <Settings2 className="size-4" /> Équipes &amp; personnes
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        {referentiel.isError || jours.isError ? (
          <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
            <AlertTriangle className="mx-auto size-6 text-destructive" />
            <p className="mt-3 text-sm font-medium text-destructive">
              Impossible de charger les données depuis Supabase.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(referentiel.error as Error | null)?.message ?? (jours.error as Error | null)?.message}
            </p>
          </div>
        ) : referentiel.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Chargement du planning…</p>
        ) : membres.length === 0 ? (
          <div className="mt-8 rounded-lg border bg-card p-8 text-center">
            <Users className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune personne enregistrée pour l&apos;instant.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/equipes">Ajouter des personnes</Link>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="planning">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <TabsList>
                <TabsTrigger value="planning">Planning</TabsTrigger>
                <TabsTrigger value="conges">Jours de congés</TabsTrigger>
              </TabsList>

              <Select value={equipeFiltre} onValueChange={setEquipeFiltre}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les équipes</SelectItem>
                  {equipes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="planning">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 rounded-md border bg-card p-1">
                  <Button variant="ghost" size="icon" onClick={() => naviguer(-1)} aria-label="Mois précédent">
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-40 text-center text-sm font-medium">
                    {MOIS[mois]} {annee}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => naviguer(1)} aria-label="Mois suivant">
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                <Select value={typeSaisie} onValueChange={(v) => setTypeSaisie(v as TypeAbsence)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_ABSENCE.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  Cliquez sur une case : vide (travaillé) → 0,5 (demi-journée) → 0 (congé) → vide.
                  Les jours fériés et de fermeture sont automatiquement à 0, mais restent
                  modifiables comme n&apos;importe quel autre jour.
                </p>
              </div>

              <Legende />

              <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-56 border-b border-r bg-card px-3 py-2 text-left font-medium">
                        Personne
                      </th>
                      {colonnes.map((c) => {
                        const sp = speciaux.get(c.date);
                        return (
                          <th
                            key={c.date}
                            title={sp?.libelle}
                            className={`w-8 border-b border-r px-0 py-1 text-center text-xs font-medium ${
                              sp
                                ? "text-[oklch(0.55_0.17_25)]"
                                : estWeekend(c.dow)
                                  ? "bg-muted text-muted-foreground"
                                  : ""
                            }`}
                          >
                            <div className="font-mono">{c.jour}</div>
                            <div className="text-[10px] text-muted-foreground">{JOURS_COURTS[c.dow]}</div>
                          </th>
                        );
                      })}
                      <th className="border-b border-r px-2 py-1 text-center text-xs font-medium">
                        Non trav.
                        <div className="text-[10px] font-normal text-muted-foreground">mois</div>
                      </th>
                      <th className="border-b px-2 py-1 text-center text-xs font-medium">
                        Non trav.
                        <div className="text-[10px] font-normal text-muted-foreground">année</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.map(({ equipe, membres: liste }) => (
                      <Fragment key={equipe.id}>
                        <tr>
                          <td
                            colSpan={colonnes.length + 3}
                            className="border-b border-t bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                            style={{ color: equipe.couleur }}
                          >
                            {equipe.nom}
                          </td>
                        </tr>
                        {liste.length === 0 && (
                          <tr>
                            <td
                              colSpan={colonnes.length + 3}
                              className="border-b px-3 py-2 text-xs text-muted-foreground"
                            >
                              Aucune personne dans cette équipe
                            </td>
                          </tr>
                        )}
                        {liste.map((m) => (
                          <tr key={m.id} className="hover:bg-accent/40">
                            <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-1.5">
                              <div className="font-medium">{m.nom}</div>
                              <div className="text-xs text-muted-foreground">
                                {projets.find((p) => p.id === m.projet_id)?.nom ?? m.role ?? "—"}
                              </div>
                            </td>
                            {colonnes.map((c) => {
                              const sp = speciaux.get(c.date);
                              const s = saisies.get(`${m.id}|${c.date}`);
                              const couleur = s
                                ? TYPES_ABSENCE.find((t) => t.value === s.type)?.couleur
                                : undefined;
                              const sansSaisie = !s && (estWeekend(c.dow) || !!sp);
                              return (
                                <td
                                  key={c.date}
                                  className={`border-b border-r p-0 text-center ${sansSaisie ? "bg-muted" : ""}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => cycler(m.id, c.date)}
                                    title={sp ? sp.libelle : `${m.nom} — ${c.date}`}
                                    className={`flex h-8 w-full items-center justify-center font-mono text-xs transition-colors hover:ring-2 hover:ring-ring/40 hover:ring-inset ${
                                      !s && sp ? "text-muted-foreground" : ""
                                    }`}
                                    style={s ? { backgroundColor: couleur, color: "oklch(0.2 0 0)" } : undefined}
                                  >
                                    {s ? (s.valeur === 0.5 ? "0,5" : "0") : sp ? "0" : ""}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="border-b border-r px-2 text-center font-mono text-xs">
                              {formatNombre(congesMois(m.id))}
                            </td>
                            <td className="border-b px-2 text-center font-mono text-xs text-muted-foreground">
                              {formatNombre(bilanAnnuel.get(m.id)?.totalConges ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="conges">
              <div className="rounded-lg border bg-card">
                <div className="px-4 py-3">
                  <h2 className="text-sm font-semibold">Jours de congés</h2>
                  <p className="text-xs text-muted-foreground">
                    Jours travaillés / non travaillés par mois, du lundi au vendredi, calculé
                    automatiquement depuis le planning. Un jour férié ou de fermeture compte comme
                    non travaillé, sauf saisie contraire dans le planning.
                  </p>
                </div>
                <div className="overflow-x-auto border-t">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 min-w-48 border-b border-r bg-card px-3 py-2 text-left font-medium">
                          Personne
                        </th>
                        {MOIS_COURTS.map((label) => (
                          <th key={label} colSpan={2} className="border-b border-l px-2 py-1 text-center font-medium">
                            {label}
                          </th>
                        ))}
                        <th colSpan={2} className="border-b border-l bg-muted/60 px-2 py-1 text-center font-medium">
                          Total année
                        </th>
                      </tr>
                      <tr>
                        <th className="sticky left-0 z-10 border-b bg-card px-3 py-1" />
                        {MOIS_COURTS.map((label) => (
                          <Fragment key={label}>
                            <th className="border-b border-l px-2 py-1 text-center font-normal text-muted-foreground">
                              Trav.
                            </th>
                            <th className="border-b px-2 py-1 text-center font-normal text-muted-foreground">
                              Non trav.
                            </th>
                          </Fragment>
                        ))}
                        <th className="border-b border-l bg-muted/60 px-2 py-1 text-center font-normal text-muted-foreground">
                          Trav.
                        </th>
                        <th className="border-b bg-muted/60 px-2 py-1 text-center font-normal text-muted-foreground">
                          Non trav.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupes.map(({ equipe, membres: liste }) => (
                        <Fragment key={equipe.id}>
                          <tr>
                            <td
                              colSpan={MOIS_COURTS.length * 2 + 3}
                              className="border-b border-t bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                              style={{ color: equipe.couleur }}
                            >
                              {equipe.nom}
                            </td>
                          </tr>
                          {liste.map((m) => {
                            const bilan = bilanAnnuel.get(m.id);
                            return (
                              <tr key={m.id} className="hover:bg-accent/40">
                                <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-1.5 font-medium">
                                  {m.nom}
                                </td>
                                {(bilan?.parMois ?? []).map((mois, i) => (
                                  <Fragment key={i}>
                                    <td className="border-b border-l px-2 py-1 text-center font-mono">
                                      {formatNombre(mois.travaille)}
                                    </td>
                                    <td className="border-b px-2 py-1 text-center font-mono text-muted-foreground">
                                      {formatNombre(mois.conges)}
                                    </td>
                                  </Fragment>
                                ))}
                                <td className="border-b border-l bg-muted/40 px-2 py-1 text-center font-mono font-medium">
                                  {formatNombre(bilan?.totalTravaille ?? 0)}
                                </td>
                                <td className="border-b bg-muted/40 px-2 py-1 text-center font-mono font-medium">
                                  {formatNombre(bilan?.totalConges ?? 0)}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      ))}
                      <tr className="bg-muted/60 font-semibold">
                        <td className="sticky left-0 z-10 border-t bg-muted/60 px-3 py-1.5">Total</td>
                        {totalGeneral.parMois.map((mois, i) => (
                          <Fragment key={i}>
                            <td className="border-t border-l px-2 py-1 text-center font-mono">
                              {formatNombre(mois.travaille)}
                            </td>
                            <td className="border-t px-2 py-1 text-center font-mono">
                              {formatNombre(mois.conges)}
                            </td>
                          </Fragment>
                        ))}
                        <td className="border-t border-l bg-muted px-2 py-1 text-center font-mono">
                          {formatNombre(totalGeneral.totalTravaille)}
                        </td>
                        <td className="border-t bg-muted px-2 py-1 text-center font-mono">
                          {formatNombre(totalGeneral.totalConges)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function formatNombre(n: number) {
  return n === 0 ? "—" : String(n).replace(".", ",");
}

function Legende() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      {TYPES_ABSENCE.map((t) => (
        <span key={t.value} className="flex items-center gap-1.5">
          <span
            className="inline-block size-3 rounded-sm border"
            style={{ backgroundColor: t.couleur }}
          />
          {t.label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm border bg-muted" /> Week-end / férié /
        fermeture
      </span>
      <span>1 = présence · 0,5 = demi-journée · 0 = absence</span>
    </div>
  );
}
