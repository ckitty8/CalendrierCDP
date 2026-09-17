import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Settings2, Users } from "lucide-react";
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
  chargerCapaciteSprint,
  chargerJours,
  chargerReferentiel,
  enregistrerJour,
  enregistrerJoursTravaillesClient,
  estWeekend,
  JOURS_COURTS,
  joursDuMois,
  MOIS,
  MOIS_COURTS,
  SPRINTS,
  TYPES_ABSENCE,
  valeurEffective,
  type CapaciteSprint,
  type Membre,
  type TypeAbsence,
  type TypeCapacite,
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
  const capacite = useQuery({
    queryKey: ["capacite"],
    queryFn: chargerCapaciteSprint,
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
                <div className="rounded-lg border bg-card">
                  <div className="px-4 py-3">
                    <h2 className="text-sm font-semibold">Capacité / vélocité d&apos;équipe</h2>
                    <p className="text-xs text-muted-foreground">
                      Jours-homme par sprint, repris du fichier Excel (feuilles Capa_Sprint).
                    </p>
                  </div>
                  {capacite.isLoading ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>
                  ) : capacite.isError ? (
                    <p className="px-4 py-6 text-sm text-destructive">
                      Impossible de charger la capacité : {(capacite.error as Error).message}
                    </p>
                  ) : (
                    <>
                      <TableauCapacite
                        titre="Réel"
                        type="reel"
                        membres={membres}
                        donnees={capacite.data ?? []}
                      />
                      <TableauCapacite
                        titre="Prévisionnel"
                        type="previsionnel"
                        membres={membres}
                        donnees={capacite.data ?? []}
                      />
                    </>
                  )}
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
  return n === 0 ? "—" : String(n).replace(".", ",");
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
  titre,
  type,
  membres,
  donnees,
}: {
  titre: string;
  type: TypeCapacite;
  membres: Membre[];
  donnees: CapaciteSprint[];
}) {
  const parMembre = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const c of donnees) {
      if (c.type !== type) continue;
      if (!map.has(c.membre_id)) map.set(c.membre_id, Array(12).fill(0));
      map.get(c.membre_id)![c.sprint - 1] = c.jours;
    }
    return map;
  }, [donnees, type]);

  const membresConcernes = membres.filter((m) => parMembre.has(m.id));
  if (membresConcernes.length === 0) {
    return (
      <p className="px-4 py-4 text-xs text-muted-foreground">
        Aucune donnée « {titre} » disponible.
      </p>
    );
  }

  const totalParSprint = Array(12).fill(0);
  for (const m of membresConcernes) {
    parMembre.get(m.id)!.forEach((v, i) => {
      totalParSprint[i] += v;
    });
  }

  return (
    <div className="border-t">
      <h3 className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-48 border-b bg-card px-3 py-2 text-left font-medium">
                Personne
              </th>
              {SPRINTS.map((s) => (
                <th key={s} className="border-b border-l px-2 py-1 text-center font-medium">
                  Sprint {s}
                </th>
              ))}
              <th className="border-b border-l bg-muted/60 px-2 py-1 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {membresConcernes.map((m) => {
              const valeurs = parMembre.get(m.id)!;
              const total = valeurs.reduce((s, v) => s + v, 0);
              return (
                <tr key={m.id} className="hover:bg-accent/40">
                  <td className="sticky left-0 z-10 border-b bg-card px-3 py-1.5 font-medium">{m.nom}</td>
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
              <td className="sticky left-0 z-10 border-t bg-muted/60 px-3 py-1.5">Total équipe</td>
              {totalParSprint.map((v, i) => (
                <td key={i} className="border-t border-l px-2 py-1 text-center font-mono">
                  {formatNombre(v)}
                </td>
              ))}
              <td className="border-t border-l bg-muted px-2 py-1 text-center font-mono">
                {formatNombre(totalParSprint.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
