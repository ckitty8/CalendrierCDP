# CalendrierCDP — règles du projet

Application web (MVP) qui reproduit l'onglet Planning du fichier Excel
`Calendrier_2026.xlsx`. Frontend uniquement (React + Vite + TypeScript +
Tailwind), pas de backend — les données sont stockées dans le
`localStorage` du navigateur (clé `calendriercdp-planning-v1`).

## Workflow de validation (règle la plus importante)

**Avant de commit/push une modification visible dans l'app**, une fois la
demande de l'utilisateur traitée et testée : générer une capture d'écran
(PNG) du résultat via Playwright et la montrer à l'utilisateur. Attendre
son accord explicite avant de pousser sur la branche de déploiement
(Vercel redéploie automatiquement à chaque push).

- La validation se fait **après chaque demande complète**, pas après
  chaque petite étape intermédiaire.
- Exception : les changements purement non-visuels (docs, config, fix de
  cache, etc.) n'ont pas besoin de capture — mais mentionner clairement ce
  qui a été fait.

## Philosophie MVP

Développement rapide et simple, sans sur-ingénierie. Ne pas construire de
fonctionnalités non demandées "au cas où". Itérer par petites étapes
validées plutôt que d'anticiper une version plus aboutie.

## Fidélité aux données du fichier Excel source

Quand une fonctionnalité doit reproduire un calcul du fichier
`Calendrier_2026.xlsx` (ex. page Congés) : **inspecter les formules
réelles des cellules** (pas seulement les valeurs affichées) avant de
supposer une règle métier. Une hypothèse "raisonnable" peut être fausse —
ça a déjà causé un bug (exclusion à tort des jours fériés/fermetures du
calcul des congés). Toujours valider un recalcul contre les valeurs de
référence du fichier avant de livrer.

## Pattern de sauvegarde

Les modifications (cellules du Planning, champs de l'équipe) passent par
un état local "brouillon" : rien n'est écrit dans le state partagé /
localStorage tant que l'utilisateur n'a pas cliqué sur le bouton
"Enregistrer" explicite de la page. Ajout/suppression (membre, projet) et
bascule Actif/Inactif restent des actions immédiates (déjà des actions
explicites en elles-mêmes).

## Mobile

L'app doit rester utilisable sans débordement horizontal de la page sur
petit écran (testé jusqu'à 280px, écran de couverture d'un Z Fold). Les
tableaux larges défilent dans leur propre conteneur, jamais la page
entière.

## Tests avant livraison

Avant de pousser un changement :
1. `npx tsc -b --noEmit` (typecheck)
2. `npm run build`
3. Vérification interactive avec Playwright (desktop **et** mobile)

## Git / déploiement

- Branche de travail : `claude/calendrier-cdp-243e6y`
- Messages de commit en français
- Vercel redéploie automatiquement à chaque push sur cette branche
- `vercel.json` : `outputDirectory: dist`, `framework: vite`, en-têtes
  no-cache sur `/` et `/index.html` (évite qu'un téléphone garde un
  bundle JS périmé en cache après un déploiement)

## README

Tenir `README.md` à jour à chaque évolution du périmètre fonctionnel de
l'app.
