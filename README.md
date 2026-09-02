# CalendrierCDP — Planning

Application web (MVP) qui reproduit l'onglet **Planning** du fichier Excel
`Calendrier_2026.xlsx` : un calendrier annuel par collaborateur, avec
sélection multiple façon Excel et export mensuel au format `.xlsx`.

## Fonctionnalités

- Grille Planning (collaborateurs × jours du mois sélectionné), colonnes week-end grisées.
- Sélection de cellules :
  - clic = sélection simple
  - `Ctrl`/`Cmd` + clic = ajouter/retirer une cellule
  - `Maj` + clic = sélection rectangulaire (comme dans Excel)
- Panneau d'édition : applique une catégorie (Présence, Férié, Fermeture,
  Absent hors projet, Congé prévisionnel, Congé validé) et une valeur
  (0 / 0,5 / 1) à toutes les cellules sélectionnées.
- Bouton "Remplir {mois} en Présence" pour pré-remplir rapidement les jours ouvrés.
- Liste des jours fériés français calculés pour l'année en cours.
- **Export Excel mois par mois** : bouton "Télécharger {mois} en Excel"
  qui génère un fichier `.xlsx` (feuille du mois, couleurs par catégorie,
  en-têtes figés) directement dans le navigateur.
- Persistance locale : les modifications sont sauvegardées automatiquement
  dans le `localStorage` du navigateur (pas de backend).

## Stack technique

- React + TypeScript + Vite
- Tailwind CSS
- [exceljs](https://github.com/exceljs/exceljs) pour la génération des fichiers Excel côté navigateur

Application 100% front-end : aucun serveur, aucune base de données. Les
données de départ (issues du fichier Excel d'origine, avec correction d'un
décalage de dates de 2 jours détecté dans le fichier source) sont embarquées
dans `src/seedData.json` et servent de point de départ ; toute modification
faite dans l'app est ensuite conservée dans le navigateur.

## Démarrage

```bash
npm install
npm run dev       # serveur de développement
npm run build     # build de production (dist/)
npm run preview   # prévisualiser le build
```

## Structure

```
src/
  types.ts              Types (Employee, DayEntry, catégories…)
  lib.ts                 Utilitaires dates, jours fériés français
  seedData.json          Données initiales (collaborateurs + jours 2026)
  usePlanningState.ts    État React + persistance localStorage
  exportExcel.ts          Génération et téléchargement du fichier Excel mensuel
  App.tsx                 Interface Planning (grille, sélection, export)
```

## État du projet

Ceci est un **MVP** : l'objectif est d'avoir rapidement une version
fonctionnelle de l'onglet Planning et de son export Excel. D'autres onglets
du fichier Excel d'origine (Congés, Sprints, Équipe…) ainsi que des
fonctionnalités plus avancées pourront être ajoutés dans une itération
ultérieure.
