import express from "express";
import "express-async-errors"; // permet aux handlers async de propager leurs erreurs à Express
import cors from "cors";
import { api } from "./routes/api.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api", api);
app.get("/health", (_req, res) => res.json({ ok: true }));

// Filet de sécurité : sans ça, une erreur dans un handler async (ex. écriture disque en
// lecture seule sur Vercel) laisse la requête sans réponse jusqu'au timeout de la plateforme
// (504), au lieu de renvoyer une erreur claire immédiatement.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: message });
});
