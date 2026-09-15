# CalendrierCDP — Planning DSI

Application de planning partagé pour suivre les congés et présences des
équipes, jour par jour, et gérer les équipes/projets/personnes.

## Fonctionnalités

- Planning mensuel par équipe : une cellule par personne/jour, cycle de
  saisie (présence → demi-journée → absence) au clic.
- Jours spéciaux (fériés, fermetures) mis en évidence.
- Page "Équipes & personnes" : gestion des équipes, projets et membres.
- Congés cumulés par mois et par an, par personne.

## Stack technique

- [TanStack Start](https://tanstack.com/start) (React + SSR, sur Vite)
- [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query)
- [Supabase](https://supabase.com) (Postgres) comme backend
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (Radix UI)

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner tes clés Supabase
npm run dev
```

Il faut un projet Supabase (URL + clé publique) et avoir appliqué la
migration de `supabase/migrations/` pour que l'app fonctionne — voir
`.env.example`.

```bash
npm run build     # build de production (preset Nitro : node-server)
npm run preview   # prévisualiser le build
```

## Structure

```
src/
  routes/                Pages (TanStack Router — fichier = route)
  components/ui/         Composants shadcn/ui
  integrations/supabase/ Client Supabase
  lib/planning.ts         Logique métier du planning
supabase/migrations/      Schéma de la base (à appliquer sur ton projet Supabase)
```

## État du projet

Build de production ciblant `node-server` (déployable sur tout hébergeur
Node) ; à adapter si une autre cible est nécessaire (Vercel, Cloudflare…).
