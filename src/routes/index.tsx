import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Settings2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  ajouterSprint,
  calculerCapacite,
  chargerJours,
  chargerReferentiel,
  chargerRepartitionTaches,
  chargerSprints,
  enregistrerJour,
  enregistrerJoursTravaillesClient,
  estWeekend,
  iso,
  JOURS_COURTS,
  joursDuMois,
  modifierPourcentageTache,
  modifierSprint,
  MOIS,
  MOIS_COURTS,
  supprimerSprint,
  TYPES_ABSENCE,
  valeurEffective,
  type DetailCapacite,
  type Jour,
  type JourSpecial,
  type Membre,
  type Sprint,
  type TacheRepartition,
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
  const [celluleActive, setCelluleActive] = useState<{ membreId: string; date: string } | null>(null);
  const [afficherCapacite, setAfficherCapacite] = useState(false);

  // Lu après le montage pour éviter un écart entre le rendu serveur et client.
  useEffect(() => {
    try {
      setAfficherCapacite(window.localStorage.getItem("planning-afficher-capacite") === "1");
    } catch {
      // localStorage indisponible : on garde la valeur par défaut (masquée).
    }
  }, []);

  const changerAffichageCapacite = (valeur: boolean) => {
    setAfficherCapacite(valeur);
    try {
      window.localStorage.setItem("planning-afficher-capacite", valeur ? "1" : "0");
    } catch {
      // idem
    }
  };

  const referentiel = useQuery({ queryKey: ["referentiel"], queryFn: chargerReferentiel });
  const jours = useQuery({ queryKey: ["jours", annee], queryFn: () => chargerJours(annee) });
  const sprintsQuery = useQuery({
    queryKey: ["sprints"],
    queryFn: chargerSprints,
    enabled: afficherCapacite,
  });
  const repartitionQuery = useQuery({
    queryKey: ["repartition-taches"],
    queryFn: chargerRepartitionTaches,
    enabled: afficherCapacite,
  });

  const mutation = useMutation({
    mutationFn: (v: {
      membre_id: string;
      date: string;
      valeur: number;
      type: TypeAbsence;
      special: boolean;
    }) => enregistrerJour(v.membre_id, v.date, v.valeur, v.type, v.special),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jours", annee] }),
    onError: (e: Error) => toast.error("Enregistrement impossible : " + e.message),
  });

  const mutationJoursClient = useMutation({
    mutationFn: (v: { membre_id: string; valeur: number | null }) =>
      enregistrerJoursTravaillesClient(v.membre_id, v.valeur),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referentiel"] }),
    onError: (e: Error) => toast.error("Enregistrement impossible : " + e.message),
  });

  const mutationAjouterSprint = useMutation({
    mutationFn: ajouterSprint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints"] }),
    onError: (e: Error) => toast.error("Ajout du sprint impossible : " + e.message),
  });

  const mutationModifierSprint = useMutation({
    mutationFn: (v: { id: string; champs: Partial<Pick<Sprint, "nom" | "date_debut" | "date_fin">> }) =>
      modifierSprint(v.id, v.champs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints"] }),
    onError: (e: Error) => toast.error("Modification du sprint impossible : " + e.message),
  });

  const mutationSupprimerSprint = useMutation({
    mutationFn: supprimerSprint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints"] }),
    onError: (e: Error) => toast.error("Suppression du sprint impossible : " + e.message),
  });

  const mutationPourcentageTache = useMutation({
    mutationFn: (v: { id: string; pourcentage: number }) => modifierPourcentageTache(v.id, v.pourcentage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repartition-taches"] }),
    onError: (e: Error) => toast.error("Modification impossible : " + e.message),
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
  const membresFiltres = groupes.flatMap((g) => g.membres);

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
    let totalJoursClient = 0;
    let totalAPrendre = 0;
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
        if (m.jours_travailles_client !== null) {
          totalJoursClient += m.jours_travailles_client;
          totalAPrendre += m.jours_travailles_client - bilan.totalTravaille;
        }
      }
    }
    return { parMois, totalTravaille, totalConges, totalJoursClient, totalAPrendre };
  }, [groupes, bilanAnnuel]);

  // Enregistre la valeur tapée au clavier (0, 0,5 ou vide = travaillé), en
  // conservant le type/couleur déjà présent sur la case le cas échéant.
  function commitValeur(membreId: string, date: string, valeur: number, special: boolean) {
    const actuel = saisies.get(`${membreId}|${date}`);
    const type: TypeAbsence = actuel?.type ?? "non_classe";
    mutation.mutate({ membre_id: membreId, date, valeur, type, special });
  }

  // Applique une couleur (congé validé/non validé) à la case actuellement
  // sélectionnée (dernière case cliquée/tapée), sans changer sa valeur.
  function appliquerType(type: TypeAbsence) {
    if (!celluleActive) {
      toast.error("Cliquez d'abord sur une case du planning.");
      return;
    }
    const s = saisies.get(`${celluleActive.membreId}|${celluleActive.date}`);
    if (!s) {
      toast.error("Saisissez d'abord une valeur (0 ou 0,5) dans la case.");
      return;
    }
    const special = speciaux.has(celluleActive.date);
    mutation.mutate({ membre_id: celluleActive.membreId, date: celluleActive.date, valeur: s.valeur, type, special });
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
                {afficherCapacite && <TabsTrigger value="capacite">Capacité</TabsTrigger>}
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

              <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={afficherCapacite}
                  onCheckedChange={(v) => changerAffichageCapacite(v === true)}
                />
                Afficher la capacité/vélocité d&apos;équipe
              </label>
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

                <p className="text-xs text-muted-foreground">
                  Cliquez sur une case et tapez 0 (congé) ou 0,5 (demi-journée) au clavier — laissez
                  vide pour travaillé. Puis cliquez sur « Congé validé » ou « Congé non validé »
                  ci-dessous pour colorer la case sélectionnée.
                </p>
              </div>

              <Legende onAppliquer={appliquerType} />

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
                    </tr>
                  </thead>
                  <tbody>
                    {groupes.map(({ equipe, membres: liste }) => (
                      <Fragment key={equipe.id}>
                        <tr>
                          <td
                            colSpan={colonnes.length + 1}
                            className="border-b border-t bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                            style={{ color: equipe.couleur }}
                          >
                            {equipe.nom}
                          </td>
                        </tr>
                        {liste.length === 0 && (
                          <tr>
                            <td
                              colSpan={colonnes.length + 1}
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
                              const sansSaisie = !s && (estWeekend(c.dow) || !!sp);
                              const estActive =
                                celluleActive?.membreId === m.id && celluleActive?.date === c.date;
                              return (
                                <td
                                  key={c.date}
                                  className={`border-b border-r p-0 text-center ${sansSaisie ? "bg-muted" : ""}`}
                                >
                                  <CelluleValeur
                                    saisie={s}
                                    special={!!sp}
                                    titre={sp ? sp.libelle : `${m.nom} — ${c.date}`}
                                    active={estActive}
                                    onFocusCell={() => setCelluleActive({ membreId: m.id, date: c.date })}
                                    onCommit={(valeur) => commitValeur(m.id, c.date, valeur, !!sp)}
                                  />
                                </td>
                              );
                            })}
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
                        <th
                          colSpan={2}
                          className="border-b border-l bg-muted/60 px-2 py-1 text-center font-medium"
                        >
                          Congés
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
                        <th className="border-b border-l bg-muted/60 px-2 py-1 text-center font-normal text-muted-foreground">
                          Trav. client
                        </th>
                        <th className="border-b bg-muted/60 px-2 py-1 text-center font-normal text-muted-foreground">
                          À prendre
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupes.map(({ equipe, membres: liste }) => (
                        <Fragment key={equipe.id}>
                          <tr>
                            <td
                              colSpan={MOIS_COURTS.length * 2 + 5}
                              className="border-b border-t bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                              style={{ color: equipe.couleur }}
                            >
                              {equipe.nom}
                            </td>
                          </tr>
                          {liste.map((m) => {
                            const bilan = bilanAnnuel.get(m.id);
                            const joursClient = m.jours_travailles_client;
                            const aPrendre = joursClient !== null ? joursClient - (bilan?.totalTravaille ?? 0) : null;
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
                                <td className="border-b border-l p-0 text-center">
                                  <SaisieJoursClient
                                    valeur={joursClient}
                                    onCommit={(v) => mutationJoursClient.mutate({ membre_id: m.id, valeur: v })}
                                  />
                                </td>
                                <td className="border-b px-2 py-1 text-center font-mono font-medium">
                                  {aPrendre === null ? "—" : formatNombre(aPrendre)}
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
                        <td className="border-t border-l bg-muted px-2 py-1 text-center font-mono">
                          {formatNombre(totalGeneral.totalJoursClient)}
                        </td>
                        <td className="border-t bg-muted px-2 py-1 text-center font-mono">
                          {formatNombre(totalGeneral.totalAPrendre)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {afficherCapacite && (
              <TabsContent value="capacite">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-card">
                    <div className="px-4 py-3">
                      <h2 className="text-sm font-semibold">Capacité par sprint</h2>
                      <p className="text-xs text-muted-foreground">
                        Jours-homme disponibles par personne, sur la période de chaque sprint. Cliquez
                        sur le nom ou les dates d&apos;un sprint pour les modifier, ou sur « + » pour en
                        ajouter un.
                      </p>
                    </div>
                    {sprintsQuery.isLoading || jours.isLoading ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>
                    ) : sprintsQuery.isError ? (
                      <p className="px-4 py-6 text-sm text-destructive">
                        Impossible de charger les sprints : {(sprintsQuery.error as Error).message}
                      </p>
                    ) : (
                      <TableauCapacite
                        membres={membresFiltres}
                        sprints={sprintsQuery.data ?? []}
                        jours={jours.data ?? []}
                        speciaux={referentiel.data?.speciaux ?? []}
                        onAjouterSprint={() => {
                          const liste = sprintsQuery.data ?? [];
                          const dernier = liste[liste.length - 1];
                          const ordre = liste.length + 1;
                          const debut = dernier ? lendemain(dernier.date_fin) : iso(annee, 0, 1);
                          mutationAjouterSprint.mutate({
                            nom: `Sprint ${ordre}`,
                            date_debut: debut,
                            date_fin: debut,
                            ordre,
                          });
                        }}
                        onModifierSprint={(id, champs) => mutationModifierSprint.mutate({ id, champs })}
                        onSupprimerSprint={(id) => mutationSupprimerSprint.mutate(id)}
                      />
                    )}
                    <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Comment est calculée la capacité ?</p>
                      <p className="mt-1">
                        Capacité = jours ouvrés de la période du sprint (hors week-ends et jours
                        fériés/fermeture) − jours de congé validés saisis dans le planning sur cette
                        même période. Survolez une case du tableau pour voir le détail du calcul.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card">
                    <div className="px-4 py-3">
                      <h2 className="text-sm font-semibold">Répartition des tâches</h2>
                      <p className="text-xs text-muted-foreground">
                        Part de la capacité totale de l&apos;équipe consacrée à chaque type de tâche.
                      </p>
                    </div>
                    {repartitionQuery.isLoading ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>
                    ) : (
                      <TableauRepartition
                        taches={repartitionQuery.data ?? []}
                        onModifierPourcentage={(id, pourcentage) =>
                          mutationPourcentageTache.mutate({ id, pourcentage })
                        }
                      />
                    )}
                  </div>

                  <div className="rounded-lg border bg-card">
                    <div className="px-4 py-3">
                      <h2 className="text-sm font-semibold">Chiffrage par sprint (jours-homme)</h2>
                      <p className="text-xs text-muted-foreground">
                        Pour chaque type de tâche : % de répartition × capacité totale de l&apos;équipe
                        sur le sprint.
                      </p>
                    </div>
                    {sprintsQuery.isLoading || repartitionQuery.isLoading || jours.isLoading ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>
                    ) : (sprintsQuery.data?.length ?? 0) === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">
                        Aucun sprint défini.
                      </p>
                    ) : (
                      <TableauTachesParSprint
                        taches={repartitionQuery.data ?? []}
                        sprints={sprintsQuery.data ?? []}
                        membres={membresFiltres}
                        jours={jours.data ?? []}
                        speciaux={referentiel.data?.speciaux ?? []}
                      />
                    )}
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}

function formatNombre(n: number) {
  return n === 0 ? "—" : String(Math.round(n * 100) / 100).replace(".", ",");
}

function lendemain(date: string) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

function Legende({ onAppliquer }: { onAppliquer: (type: TypeAbsence) => void }) {
  const validee = TYPES_ABSENCE.find((t) => t.value === "conge_valide");
  const previsionnelle = TYPES_ABSENCE.find((t) => t.value === "conge_previsionnel");
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => onAppliquer("conge_valide")}
        title="Appliquer cette couleur à la case sélectionnée"
        className="flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-accent"
      >
        <span className="inline-block size-3 rounded-sm border" style={{ backgroundColor: validee?.couleur }} />
        Congé validé
      </button>
      <button
        type="button"
        onClick={() => onAppliquer("conge_previsionnel")}
        title="Appliquer cette couleur à la case sélectionnée"
        className="flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors hover:bg-accent"
      >
        <span
          className="inline-block size-3 rounded-sm border"
          style={{ backgroundColor: previsionnelle?.couleur }}
        />
        Congé non validé
      </button>
      <span className="flex items-center gap-1.5">
        <span className="inline-block size-3 rounded-sm border bg-muted" /> Week-end / férié /
        fermeture
      </span>
    </div>
  );
}

// Case de saisie : tape directement 0, 0,5 ou vide (= travaillé) au clavier.
// La couleur ne s'applique jamais toute seule ici — elle vient du clic sur
// « Congé validé »/« Congé non validé » dans la légende, sur la case active
// (celle qui a le focus, ou la dernière sur laquelle on a cliqué).
function CelluleValeur({
  saisie,
  special,
  titre,
  active,
  onFocusCell,
  onCommit,
}: {
  saisie: { valeur: number; type: TypeAbsence } | undefined;
  special: boolean;
  titre: string;
  active: boolean;
  onFocusCell: () => void;
  onCommit: (valeur: number) => void;
}) {
  const affichage = saisie ? (saisie.valeur === 0.5 ? "0,5" : saisie.valeur === 0 ? "0" : "1") : "";
  const [texte, setTexte] = useState(affichage);

  useEffect(() => setTexte(affichage), [affichage]);

  const couleur =
    saisie?.type === "conge_valide" || saisie?.type === "conge_previsionnel"
      ? TYPES_ABSENCE.find((t) => t.value === saisie.type)?.couleur
      : undefined;

  const valider = () => {
    const brut = texte.trim().replace(",", ".");
    let valeur: number | null = null;
    if (brut === "") valeur = 1;
    else if (brut === "0") valeur = 0;
    else if (brut === "0.5") valeur = 0.5;
    else if (brut === "1") valeur = 1;
    if (valeur === null) {
      setTexte(affichage);
      return;
    }
    const valeurActuelle = saisie ? saisie.valeur : 1;
    if (valeur === valeurActuelle) return;
    onCommit(valeur);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texte}
      onChange={(e) => setTexte(e.target.value)}
      onFocus={onFocusCell}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={!saisie && special ? "0" : ""}
      title={titre}
      className={`h-8 w-full border-0 bg-transparent text-center font-mono text-xs outline-none ${
        saisie ? "font-semibold" : special ? "placeholder:text-muted-foreground" : ""
      } ${active ? "ring-2 ring-inset ring-ring" : ""}`}
      style={couleur ? { backgroundColor: couleur, color: "oklch(0.2 0 0)" } : undefined}
    />
  );
}

// Saisie du nombre de jours total travaillé client pour une personne
// (onglet Jours de congés) : accepte un nombre (ex. 218 ou 218,5) ou vide
// pour effacer. Validé à la perte de focus ou sur Entrée.
function SaisieJoursClient({
  valeur,
  onCommit,
}: {
  valeur: number | null;
  onCommit: (valeur: number | null) => void;
}) {
  const affichage = valeur === null ? "" : String(valeur).replace(".", ",");
  const [texte, setTexte] = useState(affichage);

  useEffect(() => setTexte(affichage), [affichage]);

  const valider = () => {
    const brut = texte.trim().replace(",", ".");
    if (brut === "") {
      if (valeur !== null) onCommit(null);
      return;
    }
    const nombre = Number(brut);
    if (Number.isNaN(nombre) || nombre < 0) {
      setTexte(affichage);
      return;
    }
    if (nombre !== valeur) onCommit(nombre);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texte}
      onChange={(e) => setTexte(e.target.value)}
      onBlur={valider}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder="—"
      title="Nombre de jours total travaillé client"
      className="h-8 w-full border-0 bg-transparent text-center font-mono text-xs outline-none placeholder:text-muted-foreground"
    />
  );
}

// Table capacité/vélocité (jours-homme par sprint) pour un type donné
// (réel ou prévisionnel), avec une ligne Total équipe.
function TableauCapacite({
  membres,
  sprints,
  jours,
  speciaux,
  onAjouterSprint,
  onModifierSprint,
  onSupprimerSprint,
}: {
  membres: Membre[];
  sprints: Sprint[];
  jours: Jour[];
  speciaux: JourSpecial[];
  onAjouterSprint: () => void;
  onModifierSprint: (id: string, champs: Partial<Pick<Sprint, "nom" | "date_debut" | "date_fin">>) => void;
  onSupprimerSprint: (id: string) => void;
}) {
  const detailParMembre = useMemo(() => {
    const map = new Map<string, DetailCapacite[]>();
    for (const m of membres) {
      map.set(
        m.id,
        sprints.map((s) => calculerCapacite(m.id, s.date_debut, s.date_fin, jours, speciaux)),
      );
    }
    return map;
  }, [membres, sprints, jours, speciaux]);

  const totalParSprint = sprints.map((_, i) =>
    membres.reduce((s, m) => s + (detailParMembre.get(m.id)?.[i]?.capacite ?? 0), 0),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-48 border-b bg-card px-3 py-2 text-left align-bottom font-medium">
              Personne
            </th>
            {sprints.map((s) => (
              <EnteteSprint key={s.id} sprint={s} onModifier={onModifierSprint} onSupprimer={onSupprimerSprint} />
            ))}
            <th className="border-b border-l px-2 py-1 text-center align-middle">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ajouter un sprint"
                onClick={onAjouterSprint}
              >
                <Plus className="size-4" />
              </Button>
            </th>
            <th className="border-b border-l bg-muted/60 px-2 py-1 text-center align-bottom font-medium">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {membres.length === 0 ? (
            <tr>
              <td colSpan={sprints.length + 3} className="px-3 py-4 text-center text-muted-foreground">
                Aucune personne à afficher.
              </td>
            </tr>
          ) : (
            membres.map((m) => {
              const details = detailParMembre.get(m.id) ?? [];
              const total = details.reduce((s, d) => s + d.capacite, 0);
              return (
                <tr key={m.id} className="hover:bg-accent/40">
                  <td className="sticky left-0 z-10 border-b bg-card px-3 py-1.5 font-medium">{m.nom}</td>
                  {details.map((d, i) => (
                    <td
                      key={i}
                      className="border-b border-l px-2 py-1 text-center font-mono"
                      title={`${formatNombre(d.joursOuvres)} j ouvrés − ${formatNombre(d.congesValides)} j congé validé = ${formatNombre(d.capacite)}`}
                    >
                      {formatNombre(d.capacite)}
                    </td>
                  ))}
                  <td className="border-b border-l px-2 py-1" />
                  <td className="border-b border-l bg-muted/40 px-2 py-1 text-center font-mono font-medium">
                    {formatNombre(total)}
                  </td>
                </tr>
              );
            })
          )}
          {sprints.length > 0 && (
            <tr className="bg-muted/60 font-semibold">
              <td className="sticky left-0 z-10 border-t bg-muted/60 px-3 py-1.5">Total équipe</td>
              {totalParSprint.map((v, i) => (
                <td key={i} className="border-t border-l px-2 py-1 text-center font-mono">
                  {formatNombre(v)}
                </td>
              ))}
              <td className="border-t border-l px-2 py-1" />
              <td className="border-t border-l bg-muted px-2 py-1 text-center font-mono">
                {formatNombre(totalParSprint.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {sprints.length === 0 && (
        <p className="px-3 py-4 text-xs text-muted-foreground">
          Aucun sprint défini. Cliquez sur « + » pour en ajouter un.
        </p>
      )}
    </div>
  );
}

function EnteteSprint({
  sprint,
  onModifier,
  onSupprimer,
}: {
  sprint: Sprint;
  onModifier: (id: string, champs: Partial<Pick<Sprint, "nom" | "date_debut" | "date_fin">>) => void;
  onSupprimer: (id: string) => void;
}) {
  const [nom, setNom] = useState(sprint.nom);
  useEffect(() => setNom(sprint.nom), [sprint.nom]);

  return (
    <th className="min-w-[150px] border-b border-l px-1.5 py-1.5 text-center align-top font-medium">
      <div className="flex items-center justify-center gap-1">
        <input
          className="min-w-0 flex-1 rounded border bg-transparent px-1 py-0.5 text-center text-xs font-medium"
          value={nom}
          title={nom}
          onChange={(e) => setNom(e.target.value)}
          onBlur={() => {
            const propre = nom.trim();
            if (propre && propre !== sprint.nom) onModifier(sprint.id, { nom: propre });
            else setNom(sprint.nom);
          }}
        />
        <button
          type="button"
          aria-label={`Supprimer ${sprint.nom}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (window.confirm(`Supprimer ${sprint.nom} ?`)) onSupprimer(sprint.id);
          }}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      <div className="mt-1 flex flex-col items-center gap-0.5">
        <input
          type="date"
          className="w-full rounded border bg-transparent px-1 py-0.5 text-center text-[10px] font-normal"
          value={sprint.date_debut}
          onChange={(e) => e.target.value && onModifier(sprint.id, { date_debut: e.target.value })}
        />
        <input
          type="date"
          className="w-full rounded border bg-transparent px-1 py-0.5 text-center text-[10px] font-normal"
          value={sprint.date_fin}
          onChange={(e) => e.target.value && onModifier(sprint.id, { date_fin: e.target.value })}
        />
      </div>
    </th>
  );
}

function TableauRepartition({
  taches,
  onModifierPourcentage,
}: {
  taches: TacheRepartition[];
  onModifierPourcentage: (id: string, pourcentage: number) => void;
}) {
  if (taches.length === 0) {
    return <p className="px-4 py-4 text-xs text-muted-foreground">Aucun type de tâche défini.</p>;
  }
  const total = taches.reduce((s, t) => s + t.pourcentage, 0);
  const totalArrondi = Math.round(total * 100) / 100;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b px-3 py-2 text-left font-medium">Type de tâche</th>
            <th className="border-b border-l px-3 py-2 text-center font-medium">% de la capacité</th>
          </tr>
        </thead>
        <tbody>
          {taches.map((t) => (
            <LignePourcentage key={t.id} tache={t} onModifier={onModifierPourcentage} />
          ))}
          <tr className={totalArrondi === 100 ? "bg-muted/60 font-semibold" : "bg-destructive/10 font-semibold"}>
            <td className="border-t px-3 py-1.5">Total</td>
            <td className="border-t border-l px-3 py-1.5 text-center font-mono">
              {formatNombre(totalArrondi)} %{totalArrondi !== 100 ? " (devrait faire 100 %)" : ""}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LignePourcentage({
  tache,
  onModifier,
}: {
  tache: TacheRepartition;
  onModifier: (id: string, pourcentage: number) => void;
}) {
  const [texte, setTexte] = useState(String(tache.pourcentage).replace(".", ","));
  useEffect(() => setTexte(String(tache.pourcentage).replace(".", ",")), [tache.pourcentage]);

  function valider() {
    const n = Number(texte.replace(",", "."));
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setTexte(String(tache.pourcentage).replace(".", ","));
      return;
    }
    if (n !== tache.pourcentage) onModifier(tache.id, n);
    else setTexte(String(tache.pourcentage).replace(".", ","));
  }

  return (
    <tr className="hover:bg-accent/40">
      <td className="border-b px-3 py-1.5">{tache.nom}</td>
      <td className="border-b border-l px-2 py-1 text-center">
        <input
          className="w-20 rounded border bg-transparent px-2 py-1 text-center font-mono text-sm"
          inputMode="decimal"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onBlur={valider}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />{" "}
        %
      </td>
    </tr>
  );
}

function TableauTachesParSprint({
  taches,
  sprints,
  membres,
  jours,
  speciaux,
}: {
  taches: TacheRepartition[];
  sprints: Sprint[];
  membres: Membre[];
  jours: Jour[];
  speciaux: JourSpecial[];
}) {
  const capaciteParSprint = useMemo(
    () =>
      sprints.map((s) =>
        membres.reduce(
          (total, m) => total + calculerCapacite(m.id, s.date_debut, s.date_fin, jours, speciaux).capacite,
          0,
        ),
      ),
    [sprints, membres, jours, speciaux],
  );

  if (taches.length === 0) {
    return <p className="px-4 py-4 text-xs text-muted-foreground">Aucun type de tâche défini.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-40 border-b bg-card px-3 py-2 text-left font-medium">
              Type de tâche
            </th>
            {sprints.map((s) => (
              <th key={s.id} className="border-b border-l px-2 py-1 text-center font-medium">
                {s.nom}
              </th>
            ))}
            <th className="border-b border-l bg-muted/60 px-2 py-1 text-center font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {taches.map((t) => {
            const valeurs = capaciteParSprint.map((c) => (t.pourcentage / 100) * c);
            const total = valeurs.reduce((s, v) => s + v, 0);
            return (
              <tr key={t.id} className="hover:bg-accent/40">
                <td className="sticky left-0 z-10 border-b bg-card px-3 py-1.5 font-medium">
                  {t.nom} <span className="text-muted-foreground">({formatNombre(t.pourcentage)} %)</span>
                </td>
                {valeurs.map((v, i) => (
                  <td key={i} className="border-b border-l px-2 py-1 text-center font-mono">
                    {formatNombre(v)}
                  </td>
                ))}
                <td className="border-b border-l bg-muted/40 px-2 py-1 text-center font-mono font-medium">
                  {formatNombre(total)}
                </td>
              </tr>
            );
          })}
          <tr className="bg-muted/60 font-semibold">
            <td className="sticky left-0 z-10 border-t bg-muted/60 px-3 py-1.5">
              Total (= capacité équipe)
            </td>
            {capaciteParSprint.map((v, i) => (
              <td key={i} className="border-t border-l px-2 py-1 text-center font-mono">
                {formatNombre(v)}
              </td>
            ))}
            <td className="border-t border-l bg-muted px-2 py-1 text-center font-mono">
              {formatNombre(capaciteParSprint.reduce((s, v) => s + v, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
