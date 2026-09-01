import express from "express";
import cors from "cors";
import { api } from "./routes/api.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api", api);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`CalendrierCDP API sur http://localhost:${PORT}`);
});
