import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getState, mutate } from "../state.js";
import { buildExportWorkbook } from "../xlsx/export.js";
import {
  congesRollup,
  currentSprintId,
  employeeSprintCapacity,
  estimationVariances,
  leaveBalances,
  leaveOverlapWarnings,
  sprintAllocation,
} from "../calc/engine.js";
import type { DayCategory, DayValue } from "../types.js";

export const api = Router();

api.get("/state", async (_req, res) => {
  const state = await getState();
  res.json(state);
});

// ---- Employees ----
api.post("/employees", async (req, res) => {
  const { nom, prenom, dateAnniversaire, role, forfaitJours } = req.body ?? {};
  if (!nom || !String(nom).trim()) return res.status(400).json({ error: "nom requis" });
  if (!prenom || !String(prenom).trim()) return res.status(400).json({ error: "prenom requis" });
  const emp = await mutate((state) => {
    const id = randomUUID();
    const employee = {
      id,
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      dateAnniversaire: dateAnniversaire || null,
      role: role ?? "Développeur",
      active: true,
      forfaitJours: forfaitJours ?? 218,
    };
    state.employees.push(employee);
    return employee;
  });
  res.status(201).json(emp);
});

api.put("/employees/:id", async (req, res) => {
  const { id } = req.params;
  const updated = await mutate((state) => {
    const emp = state.employees.find((e) => e.id === id);
    if (!emp) return null;
    Object.assign(emp, req.body ?? {});
    return emp;
  });
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json(updated);
});

api.delete("/employees/:id", async (req, res) => {
  const { id } = req.params;
  await mutate((state) => {
    state.employees = state.employees.filter((e) => e.id !== id);
    state.days = state.days.filter((d) => d.employeeId !== id);
    state.sprintTargets = state.sprintTargets.filter((t) => t.employeeId !== id);
  });
  res.status(204).end();
});

// ---- Days (Planning) ----
api.put("/days/:employeeId/:date", async (req, res) => {
  const { employeeId, date } = req.params;
  const { value, category } = req.body as { value: DayValue; category: DayCategory };
  if (![0, 0.5, 1].includes(value)) return res.status(400).json({ error: "value invalide" });
  await mutate((state) => {
    const existing = state.days.find((d) => d.employeeId === employeeId && d.date === date);
    if (existing) {
      existing.value = value;
      existing.category = category;
    } else {
      state.days.push({ employeeId, date, value, category });
    }
  });
  res.json({ employeeId, date, value, category });
});

api.delete("/days/:employeeId/:date", async (req, res) => {
  const { employeeId, date } = req.params;
  await mutate((state) => {
    state.days = state.days.filter((d) => !(d.employeeId === employeeId && d.date === date));
  });
  res.status(204).end();
});

// Mise à jour groupée : applique un même statut (ou l'effacement) à une liste de jours en une
// seule opération, pour éviter des dizaines/centaines d'appels individuels côté client.
interface BulkCell {
  employeeId: string;
  date: string;
}

api.put("/days/bulk", async (req, res) => {
  const { cells, value, category, clear } = req.body as {
    cells: BulkCell[];
    value?: DayValue;
    category?: DayCategory;
    clear?: boolean;
  };
  if (!Array.isArray(cells) || cells.length === 0) {
    return res.status(400).json({ error: "cells requis (tableau non vide)" });
  }
  if (!clear && ![0, 0.5, 1].includes(value as number)) {
    return res.status(400).json({ error: "value invalide" });
  }
  await mutate((state) => {
    for (const { employeeId, date } of cells) {
      if (clear) {
        state.days = state.days.filter((d) => !(d.employeeId === employeeId && d.date === date));
        continue;
      }
      const existing = state.days.find((d) => d.employeeId === employeeId && d.date === date);
      if (existing) {
        existing.value = value as DayValue;
        existing.category = category as DayCategory;
      } else {
        state.days.push({ employeeId, date, value: value as DayValue, category: category as DayCategory });
      }
    }
  });
  res.json({ updated: cells.length });
});

// ---- Ticket types & définitions ----
api.put("/ticket-types", async (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: "array attendu" });
  await mutate((state) => {
    state.ticketTypes = list;
  });
  res.json(list);
});

api.put("/ticket-defs", async (req, res) => {
  await mutate((state) => {
    state.ticketDefs = req.body;
  });
  res.json(req.body);
});

// ---- Sprint targets (prévisionnel) ----
api.put("/sprint-targets", async (req, res) => {
  const { sprintId, employeeId, previsionnelJH } = req.body ?? {};
  if (!sprintId || !employeeId) return res.status(400).json({ error: "sprintId/employeeId requis" });
  await mutate((state) => {
    const existing = state.sprintTargets.find(
      (t) => t.sprintId === sprintId && t.employeeId === employeeId
    );
    if (existing) existing.previsionnelJH = previsionnelJH;
    else state.sprintTargets.push({ sprintId, employeeId, previsionnelJH });
  });
  res.json({ sprintId, employeeId, previsionnelJH });
});

// ---- Estimations (Estimated / Spent) ----
api.put("/estimations", async (req, res) => {
  const { sprintId, ticketTypeId, estimatedJH, spentJH } = req.body ?? {};
  if (!sprintId || !ticketTypeId) return res.status(400).json({ error: "sprintId/ticketTypeId requis" });
  await mutate((state) => {
    const existing = state.estimations.find(
      (e) => e.sprintId === sprintId && e.ticketTypeId === ticketTypeId
    );
    if (existing) {
      existing.estimatedJH = estimatedJH ?? existing.estimatedJH;
      existing.spentJH = spentJH ?? existing.spentJH;
    } else {
      state.estimations.push({
        sprintId,
        ticketTypeId,
        estimatedJH: estimatedJH ?? 0,
        spentJH: spentJH ?? 0,
      });
    }
  });
  res.json({ sprintId, ticketTypeId, estimatedJH, spentJH });
});

// ---- Computed views ----
api.get("/computed/capacity", async (req, res) => {
  const state = await getState();
  const mode = req.query.mode === "previsionnel" ? "previsionnel" : "reel";
  res.json({
    capacity: employeeSprintCapacity(state, mode),
    allocation: sprintAllocation(state, mode),
  });
});

api.get("/computed/conges", async (_req, res) => {
  const state = await getState();
  res.json({ rollup: congesRollup(state), balances: leaveBalances(state) });
});

api.get("/computed/dashboard", async (_req, res) => {
  const state = await getState();
  const sprintId = currentSprintId(state);
  const capacityReel = employeeSprintCapacity(state, "reel");
  const allocationReel = sprintAllocation(state, "reel");
  res.json({
    currentSprintId: sprintId,
    leaveBalances: leaveBalances(state),
    overlapWarnings: leaveOverlapWarnings(state),
    estimationVariances: estimationVariances(state),
    currentSprintCapacity: capacityReel.filter((c) => c.sprintId === sprintId),
    currentSprintAllocation: allocationReel.filter((a) => a.sprintId === sprintId),
  });
});

// ---- Export ----
api.get("/export.xlsx", async (_req, res) => {
  const state = await getState();
  const wb = await buildExportWorkbook(state);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Calendrier_${state.meta.currentYear}_export.xlsx"`
  );
  await wb.xlsx.write(res);
  res.end();
});
