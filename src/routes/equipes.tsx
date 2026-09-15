import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { chargerReferentiel } from "@/lib/planning";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Équipes et personnes — Planning DSI" },
      {
        name: "description",
        content:
          "Gérez les équipes de la DSI, leurs projets et les personnes qui apparaissent dans le planning des congés.",
      },
      { property: "og:title", content: "Équipes et personnes — Planning DSI" },
      {
        property: "og:description",
        content: "Gérez les équipes, projets et personnes du planning DSI.",
      },
    ],
  }),
  component: Equipes,
});

function Equipes() {
  const queryClient = useQueryClient();
  const referentiel = useQuery({ queryKey: ["referentiel"], queryFn: chargerReferentiel });

  const [nomEquipe, setNomEquipe] = useState("");
  const [nomProjet, setNomProjet] = useState("");
  const [projetEquipe, setProjetEquipe] = useState("");
  const [nomMembre, setNomMembre] = useState("");
  const [roleMembre, setRoleMembre] = useState("");
  const [membreEquipe, setMembreEquipe] = useState("");
  const [membreProjet, setMembreProjet] = useState("aucun");

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["referentiel"] });
  const echec = (e: Error) => toast.error("Action impossible : " + e.message);

  const ajouterEquipe = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipes").insert({ nom: nomEquipe.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNomEquipe("");
      toast.success("Équipe ajoutée");
      rafraichir();
    },
    onError: echec,
  });

  const ajouterProjet = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projets")
        .insert({ nom: nomProjet.trim(), equipe_id: projetEquipe });
      if (error) throw error;
    },
    onSuccess: () => {
      setNomProjet("");
      toast.success("Projet ajouté");
      rafraichir();
    },
    onError: echec,
  });

  const ajouterMembre = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("membres").insert({
        nom: nomMembre.trim(),
        role: roleMembre.trim() || null,
        equipe_id: membreEquipe,
        projet_id: membreProjet === "aucun" ? null : membreProjet,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNomMembre("");
      setRoleMembre("");
      toast.success("Personne ajoutée");
      rafraichir();
    },
    onError: echec,
  });

  const supprimer = useMutation({
    mutationFn: async (v: { table: "equipes" | "projets" | "membres"; id: string }) => {
      const { error } = await supabase.from(v.table).delete().eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimé");
      rafraichir();
    },
    onError: echec,
  });

  const equipes = referentiel.data?.equipes ?? [];
  const projets = referentiel.data?.projets ?? [];
  const membres = referentiel.data?.membres ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Planning
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Équipes &amp; personnes</h1>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-6">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Équipes</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="equipe">Nom de l&apos;équipe</Label>
              <Input
                id="equipe"
                value={nomEquipe}
                onChange={(e) => setNomEquipe(e.target.value)}
                placeholder="Ex. Data Platform"
                className="w-64"
              />
            </div>
            <Button
              size="sm"
              disabled={!nomEquipe.trim() || ajouterEquipe.isPending}
              onClick={() => ajouterEquipe.mutate()}
            >
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
          <ul className="mt-4 divide-y border-t">
            {equipes.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{e.nom}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${e.nom}`}
                  onClick={() => supprimer.mutate({ table: "equipes", id: e.id })}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Projets</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="projet">Nom du projet</Label>
              <Input
                id="projet"
                value={nomProjet}
                onChange={(e) => setNomProjet(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Équipe</Label>
              <Select value={projetEquipe} onValueChange={setProjetEquipe}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!nomProjet.trim() || !projetEquipe || ajouterProjet.isPending}
              onClick={() => ajouterProjet.mutate()}
            >
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
          <ul className="mt-4 divide-y border-t">
            {projets.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {p.nom}{" "}
                  <span className="text-muted-foreground">
                    · {equipes.find((e) => e.id === p.equipe_id)?.nom}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${p.nom}`}
                  onClick={() => supprimer.mutate({ table: "projets", id: p.id })}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold">Personnes</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="membre">Nom</Label>
              <Input
                id="membre"
                value={nomMembre}
                onChange={(e) => setNomMembre(e.target.value)}
                className="w-56"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Rôle</Label>
              <Input
                id="role"
                value={roleMembre}
                onChange={(e) => setRoleMembre(e.target.value)}
                placeholder="Optionnel"
                className="w-44"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Équipe</Label>
              <Select value={membreEquipe} onValueChange={setMembreEquipe}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Projet</Label>
              <Select value={membreProjet} onValueChange={setMembreProjet}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucun">Aucun</SelectItem>
                  {projets
                    .filter((p) => !membreEquipe || p.equipe_id === membreEquipe)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!nomMembre.trim() || !membreEquipe || ajouterMembre.isPending}
              onClick={() => ajouterMembre.mutate()}
            >
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
          <ul className="mt-4 divide-y border-t">
            {membres.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium">{m.nom}</span>{" "}
                  <span className="text-muted-foreground">
                    · {equipes.find((e) => e.id === m.equipe_id)?.nom}
                    {m.projet_id ? ` · ${projets.find((p) => p.id === m.projet_id)?.nom}` : ""}
                    {m.role ? ` · ${m.role}` : ""}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${m.nom}`}
                  onClick={() => supprimer.mutate({ table: "membres", id: m.id })}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
