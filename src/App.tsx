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
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 20,
          border: "1px solid var(--border)",
          background: "var(--card)",
          borderRadius: "calc(var(--radius) + 4px)",
          padding: 4,
          width: "fit-content",
        }}
      >
        {NAV.map((n) => {
          const active = n.key === page;
          return (
            <button
              key={n.key}
              onClick={() => setPage(n.key)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: "var(--radius)",
                border: "none",
                background: active ? "var(--secondary)" : "transparent",
                color: active ? "var(--secondary-foreground)" : "var(--muted-foreground)",
                cursor: "pointer",
                whiteSpace: "nowrap",
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
