import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAppState } from "./AppStateContext";
import { api } from "./api";
import Dashboard from "./pages/Dashboard";
import Planning from "./pages/Planning";
import Sprints from "./pages/Sprints";
import TicketTypes from "./pages/TicketTypes";
import Team from "./pages/Team";

const NAV = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/planning", label: "Planning & Congés" },
  { to: "/sprints", label: "Capacité & Sprints" },
  { to: "/tickets", label: "Types de ticket" },
  { to: "/equipe", label: "Équipe" },
];

function linkClass(active: boolean) {
  return `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-200"
  }`;
}

export default function App() {
  const { state, loading, error } = useAppState();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4 flex flex-col">
        <div className="mb-6">
          <div className="text-lg font-bold text-brand-700">CalendrierCDP</div>
          <div className="text-xs text-slate-500">
            {state ? `Année ${state.meta.currentYear}` : "..."}
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => linkClass(isActive)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200">
          <a
            href={api.exportUrl()}
            className="block text-center rounded-lg bg-slate-900 text-white text-sm font-medium px-3 py-2 hover:bg-slate-700"
          >
            Exporter en Excel
          </a>
          <p className="mt-2 text-[11px] text-slate-400 leading-snug">
            Génère un .xlsx à jour (mêmes onglets et calculs) — à déposer dans votre dossier Drive.
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6">
        {loading && <div className="text-slate-500">Chargement…</div>}
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 border border-red-200 p-4 text-sm">
            Erreur de connexion à l'API : {error}
          </div>
        )}
        {state && (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/conges" element={<Navigate to="/planning" replace />} />
            <Route path="/sprints" element={<Sprints />} />
            <Route path="/tickets" element={<TicketTypes />} />
            <Route path="/equipe" element={<Team />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
