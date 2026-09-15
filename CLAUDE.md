# CalendrierCDP — règles du projet

Application de planning d'équipe (congés/présences). Stack : **TanStack
Start** (React + SSR, via Vite) + **Supabase** (Postgres) comme backend.

## Backend / configuration requise

- Crée un projet Supabase, applique la migration dans
  `supabase/migrations/`, puis copie `.env.example` vers `.env` et
  renseigne les clés (Project Settings > API).
- Ne jamais committer `.env` (déjà dans `.gitignore`) ni coller une clé
  Supabase en dur dans le code ou dans un message.

## Déploiement

Build Nitro avec le preset `node-server` (portable, déployable sur tout
hébergeur Node — `node .output/server/index.mjs`). Adapter le preset dans
`vite.config.ts` si une autre cible est retenue (Vercel, Cloudflare...).

## Workflow de validation

Avant de commit/push une modification visible : générer une capture
d'écran (PNG) via Playwright et obtenir l'accord explicite de
l'utilisateur avant de pousser sur la branche de déploiement.

## Mobile

L'app doit rester utilisable sans débordement horizontal sur petit écran.

## Tests avant livraison

1. `npx tsc --noEmit`
2. `npm run build`
3. Vérification interactive (desktop et mobile)

## Git

- Branche de travail : `claude/calendrier-cdp-243e6y`
- Messages de commit en français
