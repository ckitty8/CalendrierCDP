import { useState } from "react";
import { usePlanningState } from "./usePlanningState";
import PlanningPage from "./PlanningPage";
import TeamPage from "./TeamPage";

type Page = "planning" | "equipe";

const NAV: { key: Page; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "equipe", label: "Équipe" },
];

export default function App() {
  const [state, setState] = usePlanningState();
  const [page, setPage] = useState<Page>("planning");

  return (
    <div className="page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {NAV.map((n) => {
          const active = n.key === page;
          return (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 8,
                border: active ? "1px solid #2569f5" : "1px solid #e2e8f0",
                background: active ? "#2569f5" : "#fff",
                color: active ? "#fff" : "#334155",
                cursor: "pointer",
              }}
            >
              {n.label}
            </button>
          );
        })}
      </nav>

      {page === "planning" ? <PlanningPage state={state} setState={setState} /> : <TeamPage state={state} setState={setState} />}
    </div>
  );
}
