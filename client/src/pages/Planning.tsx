import { useMemo, useState } from "react";
import { useAppState } from "../AppStateContext";
import { api, CATEGORY_COLORS, CATEGORY_LABELS } from "../api";
import type { DayCategory, DayValue } from "../types";
import { MONTH_LABELS, daysInMonth, employeeColor, isWeekend, isoDate, weekdayLetter } from "../lib";

const CATEGORY_ORDER: DayCategory[] = [
  "ferie",
  "fermeture",
  "absent_projet",
  "conge_previsionnel",
  "conge_valide",
];

export default function Planning() {
  const { state, refresh } = useAppState();
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [selected, setSelected] = useState<{ employeeId: string; date: string } | null>(null);
  const [pendingValue, setPendingValue] = useState<DayValue | null>(null);
  const [saving, setSaving] = useState(false);

  const year = state!.meta.currentYear;
  const nDays = daysInMonth(year, month);
  const dates = useMemo(() => Array.from({ length: nDays }, (_, i) => isoDate(year, month, i + 1)), [year, month, nDays]);

  const dayIndex = useMemo(() => {
    const idx = new Map<string, { value: DayValue; category: DayCategory }>();
    for (const d of state!.days) idx.set(`${d.employeeId}|${d.date}`, { value: d.value, category: d.category });
    return idx;
  }, [state]);

  async function save(employeeId: string, date: string, value: DayValue, category: DayCategory) {
    setSaving(true);
    try {
      await api.setDay(employeeId, date, value, category);
      await refresh();
    } finally {
      setSaving(false);
      setSelected(null);
      setPendingValue(null);
    }
  }

  async function clear(employeeId: string, date: string) {
    setSaving(true);
    try {
      await api.clearDay(employeeId, date);
      await refresh();
    } finally {
      setSaving(false);
      setSelected(null);
      setPendingValue(null);
    }
  }

  const employees = state!.employees;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Planning {year}</h1>
        <div className="flex gap-1 flex-wrap">
          {MONTH_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                setMonth(i + 1);
                setSelected(null);
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
                  <span className={emp.active ? "text-slate-800" : "text-slate-400"}>{emp.name}</span>
                </td>
                {dates.map((d) => {
                  const entry = dayIndex.get(`${emp.id}|${d}`);
                  const weekend = isWeekend(d);
                  const isSelected = selected?.employeeId === emp.id && selected?.date === d;
                  return (
                    <td
                      key={d}
                      className={`border-b border-l border-slate-100 text-center align-middle w-8 h-9 text-xs ${
                        weekend ? "bg-slate-50" : "cursor-pointer hover:ring-2 hover:ring-brand-300"
                      } ${isSelected ? "ring-2 ring-brand-500" : ""}`}
                      style={{ background: !weekend && entry ? CATEGORY_COLORS[entry.category] : undefined }}
                      onClick={() => {
                        if (weekend) return;
                        setSelected({ employeeId: emp.id, date: d });
                        setPendingValue(null);
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

      {selected && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <div className="text-sm font-medium text-slate-800">
            {employees.find((e) => e.id === selected.employeeId)?.name} —{" "}
            {new Date(selected.date + "T00:00:00Z").toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              disabled={saving}
              onClick={() => save(selected.employeeId, selected.date, 1, "normal")}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-300 hover:bg-slate-100"
            >
              Présence (1j)
            </button>
            <button
              disabled={saving}
              onClick={() => setPendingValue(0.5)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                pendingValue === 0.5 ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-300 hover:bg-slate-100"
              }`}
            >
              Demi-journée (0.5j)
            </button>
            <button
              disabled={saving}
              onClick={() => setPendingValue(0)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${
                pendingValue === 0 ? "bg-brand-600 text-white border-brand-600" : "bg-white border-slate-300 hover:bg-slate-100"
              }`}
            >
              Absence (0j)
            </button>
            <button
              disabled={saving}
              onClick={() => clear(selected.employeeId, selected.date)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-slate-300 text-slate-500 hover:bg-slate-100"
            >
              Effacer
            </button>
          </div>
          {pendingValue !== null && (
            <div className="flex gap-2 flex-wrap pt-2 border-t border-brand-100">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  disabled={saving}
                  onClick={() => save(selected.employeeId, selected.date, pendingValue, cat)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-white"
                  style={{ background: CATEGORY_COLORS[cat] }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
