# CalendrierCDP

Application web qui reprend le fichier `Calendrier_2026.xlsx` (planning d'équipe,
congés, capacité de sprint, types de ticket) et devient l'outil de référence :
tu travailles dans l'app, et un export `.xlsx` à jour (mêmes onglets, mêmes
calculs) est généré à la demande pour archivage / dépôt dans ton Drive.

## Stack

- **server/** — Express + TypeScript. La donnée vit dans `server/data/store.xlsx`,
  un classeur Excel (lu/écrit avec `exceljs`) qui sert de base de données —
  conformément à "je stocke en Excel pour le moment". Au premier démarrage,
  ce fichier est généré depuis `server/data/seed.json` (extrait du fichier
  original que tu as fourni).
- **client/** — React + Vite + TypeScript + Tailwind.

Le jour où tu veux basculer sur Supabase, seule la couche `server/src/xlsx/store.ts`
(fonctions `loadState`/`saveState`) doit changer — le reste de l'app (calc engine,
routes, UI) ne connaît que la forme `AppState` en mémoire.

## Démarrer

```bash
npm run install:all   # installe server + client
npm run dev            # lance l'API (port 4000) et le front (port 5173)
```

Puis ouvrir http://localhost:5173. Le front proxifie `/api` vers `localhost:4000`.

## Pages

- **Tableau de bord** — capacité du sprint courant, répartition par type de
  ticket, soldes de congés par personne, alertes de congés simultanés, écarts
  estimé/réalisé.
- **Planning** — calendrier jour par jour par personne (clic sur une case pour
  saisir présence / demi-journée / absence + catégorie : férié, fermeture,
  absent du projet, congé prévisionnel, congé validé).
- **Congés** — synthèse mensuelle travaillé/congés par personne, écart au
  forfait annuel (218 jours par défaut, modifiable par personne).
- **Capacité & Sprints** — capacité par sprint (Réel calculé depuis le planning,
  ou Prévisionnel pour anticiper), répartition par type de ticket, et saisie
  Estimé/Réalisé (JH) par sprint issue d'Azure DevOps.
- **Types de ticket** — pourcentages de répartition (US absorbe le reste) +
  tables de référence SLA (Bug/Incident, criticité × priorité).
- **Équipe** — ajout/désactivation des personnes, forfait annuel.

Bouton **Exporter en Excel** (dans le menu) : régénère un `.xlsx` avec les
mêmes onglets que l'original (Équipe, Planning, Congés, Capa_Sprint_Réel,
Capa_Sprint_Prévisionnel, Définition_typeTicket), calculs et couleurs
identiques — prêt à être déposé dans ton dossier Drive.

## Ce qui a changé par rapport au fichier Excel d'origine

- **Un seul moteur de calcul** pour la répartition par type de ticket, au lieu
  de la logique dupliquée dans `Feuil1`, `Capa_Sprint_Réel` et
  `Capa_Sprint_prévisionnel` du fichier source (risque d'incohérence supprimé).
- **Jours fériés calculés automatiquement** (algorithme, plus besoin de
  colorier les cellules à la main chaque année).
- **Alertes automatiques** : congés simultanés qui fragilisent l'équipe, écarts
  estimé/réalisé, écart au forfait annuel.
- **Multi-année native** : `meta.currentYear` pilote tout, pas besoin de dupliquer
  un onglet par an (l'ancien fichier avait `SUPP` comme copie 2025) — il suffira
  d'archiver l'état et de repartir avec une nouvelle année.
- Les onglets `Feuil1`/`Feuil2` du fichier original (brouillons redondants avec
  `Capa_Sprint_Réel`) n'ont pas été repris tels quels.

## Pistes pour la gestion d'équipe (non implémentées, à prioriser)

- Suivi de vélocité / burndown par sprint (au-delà d'Estimé vs Réalisé).
- Matrice de compétences + plan de montée en charge (bus factor).
- Historique des 1:1 et objectifs individuels.
- Rotation d'astreinte / on-call.
- Détection d'un pipeline de recrutement quand la capacité prévisionnelle
  décroche durablement de la charge projetée.
- Bascule du stockage vers Supabase (le module `server/src/xlsx/store.ts` est
  le seul point à remplacer).
