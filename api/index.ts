// Point d'entrée Vercel Serverless Function : réexporte l'app Express telle quelle.
// Toutes les requêtes /api/* sont routées ici (voir vercel.json), l'app Express fait
// ensuite son propre routage interne à partir du chemin d'origine.
export { app as default } from "../server/src/app.js";
