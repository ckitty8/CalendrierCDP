import { useMemo, useState } from "react";
import { useAppState } from "../AppStateContext";
import { api, CATEGORY_COLORS, CATEGORY_LABELS } from "../api";
import type { DayCategory, DayValue } from "../types";
import { MONTH_LABELS, daysInMonth, employeeColor, fullName, isWeekend, isoDate, weekdayLetter } from "../lib";

const CATEGORY_ORDER: DayCategory[] = [
  "ferie",
  "fermeture",
  "absent_projet",
  "conge_previsionnel",
  "conge_valide",
];

interface StatusOption {
  key: string;
  value: DayValue | null;
  category: DayCategory | null;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { key: "clear", value: null, category: null, label: "— Non renseigné —" },
  { key: "1|normal", value: 1, category: "normal", label: "Présence (1j)" },
  { key: "0|ferie", value: 0, category: "ferie", label: "Férié" },
  { key: "0|fermeture", value: 0, category: "fermeture", label: "Fermeture entreprise" },
  { key: "0|absent_projet", value: 0, category: "absent_projet", label: "Absent du projet" },
  { key: "0|conge_previsionnel", value: 0, category: "conge_previsionnel", label: "Congé prévisionnel" },
  { key: "0.5|conge_previsionnel", value: 0.5, category: "conge_previsionnel", label: "Congé prévisionnel (demi-journée)" },
  { key: "0|conge_valide", value: 0, category: "conge_valide", label: "Congé validé" },
  { key: "0.5|conge_valide", value: 0.5, category: "conge_valide", label: "Congé validé (demi-journée)" },
];

const DEFAULT_BULK_KEY = "1|normal"; // par défaut, la sélection multiple applique Présence (1j)

function cellKey(employeeId: string, date: string): string {
  return `${employeeId}|${date}`;
}

export default function Planning() {
  const { state, refresh } = useAppState();
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [selected, setSelected] = useState<{ employeeId: string; date: string } | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkStatusKey, setBulkStatusKey] = useState(DEFAULT_BULK_KEY);
  const [saving, setSaving] = useState(false);

  const year = state!.meta.currentYear;
  const nDays = daysInMonth(year, month);
  const dates = useMemo(() => Array.from({ length: nDays }, (_, i) => isoDate(year, month, i + 1)), [year, month, nDays]);

  const dayIndex = useMemo(() => {
    const idx = new Map<string, { value: DayValue; category: DayCategory }>();
    for (const d of state!.days) idx.set(cellKey(d.employeeId, d.date), { value: d.value, category: d.category });
    return idx;
  }, [state]);

  const employees = state!.employees;

  function resetSelections() {
    setSelected(null);
    setSelection(new Set());
  }

  function toggleMultiMode() {
    setMultiMode((v) => !v);
    resetSelections();
  }

  function toggleCellSelection(employeeId: string, date: string) {
    if (multiMode) {
      setSelection((prev) => {
        const next = new Set(prev);
        const key = cellKey(employeeId, date);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    } else {
      setSelected({ employeeId, date });
    }
  }

  async function handleStatusChange(employeeId: string, date: string, optionKey: string) {
    setSaving(true);
    try {
      if (optionKey === "clear") {
        await api.clearDay(employeeId, date);
      } else {
        const option = STATUS_OPTIONS.find((o) => o.key === optionKey);
        if (option && option.value !== null && option.category !== null) {
          await api.setDay(employeeId, date, option.value, option.category);
        }
      }
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function applyBulk() {
    if (selection.size === 0) return;
    const cells = Array.from(selection).map((key) => {
      const [employeeId, date] = key.split("|");
      return { employeeId, date };
    });
    const option = STATUS_OPTIONS.find((o) => o.key === bulkStatusKey)!;
    setSaving(true);
    try {
      if (option.key === "clear") {
        await api.setDaysBulk(cells, { clear: true });
      } else {
        await api.setDaysBulk(cells, { value: option.value as DayValue, category: option.category as DayCategory });
      }
      await refresh();
      setSelection(new Set());
    } finally {
      setSaving(false);
    }
  }

  /** Jours ouvrés (hors week-end) du mois affiché, toutes personnes, qui n'ont encore aucune
   * valeur saisie — sert au remplissage par défaut en Présence. */
  function emptyWeekdayCellsForMonth(): { employeeId: string; date: string }[] {
    const cells: { employeeId: string; date: string }[] = [];
    for (const emp of employees) {
      for (const d of dates) {
        if (isWeekend(d)) continue;
        if (!dayIndex.has(cellKey(emp.id, d))) cells.push({ employeeId: emp.id, date: d });
      }
    }
    return cells;
  }

  function emptyWeekdayCellsForYear(): { employeeId: string; date: string }[] {
    const cells: { employeeId: string; date: string }[] = [];
    for (let m = 1; m <= 12; m++) {
      const n = daysInMonth(year, m);
      for (const emp of employees) {
        for (let day = 1; day <= n; day++) {
          const d = isoDate(year, m, day);
          if (isWeekend(d)) continue;
          if (!dayIndex.has(cellKey(emp.id, d))) cells.push({ employeeId: emp.id, date: d });
        }
      }
    }
    return cells;
  }

  async function fillPresence(cells: { employeeId: string; date: string }[]) {
    if (cells.length === 0) return;
    setSaving(true);
    try {
      await api.setDaysBulk(cells, { value: 1, category: "normal" });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Planning {year}</h1>
        <div className="flex gap-1 flex-wrap">
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                setMonth(i + 1);
                resetSelections();
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                month === i + 1 ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={toggleMultiMode}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
            multiMode ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
          }`}
        >
          {multiMode ? "Sélection multiple activée" : "Activer la sélection multiple"}
        </button>
        <button
          disabled={saving}
          onClick={() => fillPresence(emptyWeekdayCellsForMonth())}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          Remplir le mois en Présence
        </button>
        <button
          disabled={saving}
          onClick={() => fillPresence(emptyWeekdayCellsForYear())}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          Remplir l'année en Présence
        </button>
        <span className="text-xs text-slate-400">
          Les jours ouvrés sans saisie sont mis à Présence (1j) ; les jours déjà renseignés ne sont pas modifiés.
        </span>
      </div>

      <div className="flex gap-3 flex-wrap text-xs">
        {(["normal", ...CATEGORY_ORDER] as DayCategory[]).map((c) => (
          <div key={c} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm border border-slate-300"
              style={{ background: CATEGORY_COLORS[c] }}
            />
            <span className="text-slate-600">{CATEGORY_LABELS[c]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-slate-500 border-b border-slate-200 min-w-[160px]">
                Employé
              </th>
              {dates.map((d) => (
                <th
                  key={d}
                  className={`p-1 text-[10px] font-medium border-b border-slate-200 w-8 ${
                    isWeekend(d) ? "bg-slate-50 text-slate-300" : "text-slate-500"
                  }`}
                >
                  <div>{d.slice(8, 10)}</div>
                  <div>{weekdayLetter(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, i) => (
              <tr key={emp.id}>
                <td className="sticky left-0 bg-white p-2 text-sm border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: employeeColor(i) }} />
                  <span className={emp.active ? "text-slate-800" : "text-slate-400"}>{fullName(emp)}</span>
                </td>
                {dates.map((d) => {
                  const entry = dayIndex.get(cellKey(emp.id, d));
                  const weekend = isWeekend(d);
                  const key = cellKey(emp.id, d);
                  const isSingleSelected = !multiMode && selected?.employeeId === emp.id && selected?.date === d;
                  const isMultiSelected = multiMode && selection.has(key);
                  return (
                    <td
                      key={d}
                      className={`border-b border-l border-slate-100 text-center align-middle w-8 h-9 text-xs ${
                        weekend ? "bg-slate-50" : "cursor-pointer hover:ring-2 hover:ring-brand-300"
                      } ${isSingleSelected ? "ring-2 ring-brand-500" : ""} ${
                        isMultiSelected ? "ring-2 ring-emerald-500" : ""
                      }`}
                      style={{ background: !weekend && entry ? CATEGORY_COLORS[entry.category] : undefined }}
                      onClick={() => {
                        if (weekend) return;
                        toggleCellSelection(emp.id, d);
                      }}
                    >
                      {!weekend && entry ? entry.value : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {multiMode && selection.size > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 flex-wrap sticky bottom-4 shadow-md">
          <span className="text-sm font-medium text-slate-800">{selection.size} jour(s) sélectionné(s)</span>
          <select
            disabled={saving}
            value={bulkStatusKey}
            onChange={(e) => setBulkStatusKey(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-w-[260px] disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            disabled={saving}
            onClick={applyBulk}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Appliquer
          </button>
          <button
            disabled={saving}
            onClick={() => setSelection(new Set())}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-300 text-slate-500 hover:bg-slate-100"
          >
            Tout désélectionner
          </button>
        </div>
      )}

      {!multiMode && selected && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <div className="text-sm font-medium text-slate-800">
            {(() => {
              const emp = employees.find((e) => e.id === selected.employeeId);
              return emp ? fullName(emp) : "";
            })()} —{" "}
            {new Date(selected.date + "T00:00:00Z").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </div>
          <select
            disabled={saving}
            value={(() => {
              const entry = dayIndex.get(cellKey(selected.employeeId, selected.date));
              return entry ? `${entry.value}|${entry.category}` : "clear";
            })()}
            onChange={(e) => handleStatusChange(selected.employeeId, selected.date, e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-w-[260px] disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
