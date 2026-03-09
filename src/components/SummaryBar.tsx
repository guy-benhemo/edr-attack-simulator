import { Scenario, ScenarioStatus } from "../types";

const PILL_CONFIG: Record<ScenarioStatus, { label: string; color: string }> = {
  ready: { label: "Ready", color: "bg-white/10 text-white/70" },
  executing: {
    label: "Executing",
    color: "bg-guardz-purple/20 text-guardz-light-purple",
  },
  blocked: {
    label: "Blocked",
    color: "bg-guardz-green/20 text-guardz-green",
  },
  completed: {
    label: "Completed",
    color: "bg-guardz-teal-green/20 text-guardz-bright-green",
  },
  failed: { label: "Failed", color: "bg-guardz-dark-red/20 text-guardz-pink" },
};

export default function SummaryBar({
  scenarios,
}: {
  scenarios: Scenario[];
}) {
  const counts = scenarios.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<ScenarioStatus, number>,
  );

  return (
    <div className="flex flex-wrap gap-3">
      {(Object.entries(PILL_CONFIG) as [ScenarioStatus, (typeof PILL_CONFIG)[ScenarioStatus]][]).map(
        ([status, config]) => {
          const count = counts[status] || 0;
          if (count === 0) return null;
          return (
            <div
              key={status}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.color}`}
            >
              <span className="font-bold">{count}</span>
              <span>{config.label}</span>
            </div>
          );
        },
      )}
    </div>
  );
}
