import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Settings2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  chargerJours,
  chargerReferentiel,
  enregistrerJour,
  estWeekend,
  JOURS_COURTS,
  joursDuMois,
  MOIS,
  TYPES_ABSENCE,
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
  const [mois, setMois] = useState(new Date().getMonth());
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

  function congesMois(membreId: string) {
    let total = 0;
    for (const c of colonnes) {
      const s = saisies.get(`${membreId}|${c.date}`);
      if (s && !estWeekend(c.dow) && !speciaux.has(c.date)) total += 1 - s.valeur;
    }
    return total;
  }

  function congesAnnee(membreId: string) {
    let total = 0;
    for (const j of jours.data ?? []) {
      if (j.membre_id === membreId) total += 1 - Number(j.valeur);
    }
    return total;
  }

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
            Cliquez sur une case : demi-journée (0,5) → journée entière (0) → présence (1)
          </p>
        </div>

        <Legende />

        {referentiel.isLoading ? (
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
                    Congés
                    <div className="text-[10px] font-normal text-muted-foreground">mois</div>
                  </th>
                  <th className="border-b px-2 py-1 text-center text-xs font-medium">
                    Congés
                    <div className="text-[10px] font-normal text-muted-foreground">année</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupes.map(({ equipe, membres: liste }) => (
                  <>
                    <tr key={equipe.id}>
                      <td
                        colSpan={colonnes.length + 3}
                        className="border-b border-t bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: equipe.couleur }}
                      >
                        {equipe.nom}
                      </td>
                    </tr>
                    {liste.length === 0 && (
                      <tr key={equipe.id + "-vide"}>
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
                          const off = estWeekend(c.dow) || !!sp;
                          const couleur = s
                            ? TYPES_ABSENCE.find((t) => t.value === s.type)?.couleur
                            : undefined;
                          return (
                            <td
                              key={c.date}
                              className={`border-b border-r p-0 text-center ${off ? "bg-muted" : ""}`}
                            >
                              <button
                                type="button"
                                onClick={() => cycler(m.id, c.date)}
                                title={sp ? sp.libelle : `${m.nom} — ${c.date}`}
                                className="flex h-8 w-full items-center justify-center font-mono text-xs transition-colors hover:ring-2 hover:ring-ring/40 hover:ring-inset"
                                style={
                                  s && !off
                                    ? { backgroundColor: couleur, color: "oklch(0.2 0 0)" }
                                    : undefined
                                }
                              >
                                {sp ? "" : s ? (s.valeur === 0.5 ? "0,5" : "0") : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="border-b border-r px-2 text-center font-mono text-xs">
                          {formatNombre(congesMois(m.id))}
                        </td>
                        <td className="border-b px-2 text-center font-mono text-xs text-muted-foreground">
                          {formatNombre(congesAnnee(m.id))}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
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
