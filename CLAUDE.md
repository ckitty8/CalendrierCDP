# CalendrierCDP — règles du projet

Application de planning d'équipe (congés/présences), reprise du code de
l'app Lovable `dsi-leave-buddy`. Stack : **TanStack Start** (React + SSR,
via Vite) + **Supabase** (Postgres) comme backend — ce n'est plus une
app frontend-only/localStorage (ancienne version abandonnée).

## Backend / configuration requise

- Crée un projet Supabase, applique la migration dans
  `supabase/migrations/`, puis copie `.env.example` vers `.env` et
  renseigne les clés (Project Settings > API).
- Ne jamais committer `.env` (déjà dans `.gitignore`) ni coller une clé
  Supabase en dur dans le code ou dans un message.
- Le client Supabase (`src/integrations/supabase/`) est generé/maintenu
  par Lovable ("Do not edit it directly") — éviter d'y toucher à la main
  si le projet reste synchronisé avec Lovable.

## Déploiement

Le build n'est plus une SPA statique Vite : c'est une app SSR (Nitro,
cible par défaut Cloudflare via `@lovable.dev/vite-tanstack-config`).
L'ancien `vercel.json` (SPA statique, `outputDirectory: dist`) a été
supprimé car obsolète — la cible de déploiement (Cloudflare, Vercel avec
preset Nitro adapté, Node...) reste à décider avant tout déploiement en
prod.

## Workflow de validation

Avant de commit/push une modification visible : générer une capture
d'écran (PNG) via Playwright et obtenir l'accord explicite de
l'utilisateur avant de pousser sur la branche de déploiement.

## Mobile

L'app doit rester utilisable sans débordement horizontal sur petit écran.

## Tests avant livraison

1. `npm run build`
2. Vérification interactive (desktop et mobile)

## Git

- Branche de travail : `claude/calendrier-cdp-243e6y`
- Messages de commit en français
