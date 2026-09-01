import express from "express";
import cors from "cors";
import { api } from "./routes/api.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/api", api);
app.get("/health", (_req, res) => res.json({ ok: true }));
