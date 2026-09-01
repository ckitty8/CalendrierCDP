import type {
  AppState,
  DashboardData,
  CongesRow,
  LeaveBalance,
  CapacityRow,
  AllocationRow,
  DayValue,
  DayCategory,
  TicketType,
  TicketDefs,
  Employee,
} from "./types";

const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getState: () => req<AppState>("/state"),
  getDashboard: () => req<DashboardData>("/computed/dashboard"),
  getConges: () => req<{ rollup: CongesRow[]; balances: LeaveBalance[] }>("/computed/conges"),
  getCapacity: (mode: "reel" | "previsionnel") =>
    req<{ capacity: CapacityRow[]; allocation: AllocationRow[] }>(`/computed/capacity?mode=${mode}`),

  addEmployee: (data: Partial<Employee>) =>
    req<Employee>("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    req<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => req<void>(`/employees/${id}`, { method: "DELETE" }),

  setDay: (employeeId: string, date: string, value: DayValue, category: DayCategory) =>
    req(`/days/${employeeId}/${date}`, { method: "PUT", body: JSON.stringify({ value, category }) }),
  clearDay: (employeeId: string, date: string) =>
    req<void>(`/days/${employeeId}/${date}`, { method: "DELETE" }),

  setTicketTypes: (types: TicketType[]) =>
    req<TicketType[]>("/ticket-types", { method: "PUT", body: JSON.stringify(types) }),
  setTicketDefs: (defs: TicketDefs) =>
    req<TicketDefs>("/ticket-defs", { method: "PUT", body: JSON.stringify(defs) }),

  setSprintTarget: (sprintId: string, employeeId: string, previsionnelJH: number) =>
    req("/sprint-targets", { method: "PUT", body: JSON.stringify({ sprintId, employeeId, previsionnelJH }) }),

  setEstimation: (sprintId: string, ticketTypeId: string, estimatedJH: number, spentJH: number) =>
    req("/estimations", { method: "PUT", body: JSON.stringify({ sprintId, ticketTypeId, estimatedJH, spentJH }) }),

  exportUrl: () => `${BASE}/export.xlsx`,
};

export const CATEGORY_LABELS: Record<DayCategory, string> = {
  normal: "Présence",
  ferie: "Férié",
  fermeture: "Fermeture entreprise",
  absent_projet: "Absent du projet",
  conge_previsionnel: "Congé prévisionnel",
  conge_valide: "Congé validé",
};

export const CATEGORY_COLORS: Record<DayCategory, string> = {
  normal: "#ffffff",
  ferie: "#c65911",
  fermeture: "#806000",
  absent_projet: "#7b7b7b",
  conge_previsionnel: "#ffc000",
  conge_valide: "#a9d08e",
};
