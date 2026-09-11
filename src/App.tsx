import { useState } from "react";
import { usePlanningState } from "./usePlanningState";
import PlanningPage from "./PlanningPage";
import TeamPage from "./TeamPage";
import SprintCapacityPage from "./SprintCapacityPage";
import TimeTrackingPage from "./TimeTrackingPage";

type Page = "planning" | "equipe" | "sprints" | "temps";

const NAV: { key: Page; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "equipe", label: "Administration" },
  { key: "sprints", label: "Capacité de sprint" },
  { key: "temps", label: "Temps par équipe" },
];

export default function App() {
  const [state, setState] = usePlanningState();
  const [page, setPage] = useState<Page>("planning");

  return (
    <div className="page" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
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

      <div hidden={page !== "planning"}>
        <PlanningPage state={state} setState={setState} />
      </div>
      <div hidden={page !== "equipe"}>
        <TeamPage state={state} setState={setState} />
      </div>
      <div hidden={page !== "sprints"}>
        <SprintCapacityPage state={state} setState={setState} />
      </div>
      <div hidden={page !== "temps"}>
        <TimeTrackingPage state={state} setState={setState} />
      </div>
    </div>
  );
}
