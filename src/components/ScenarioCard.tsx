import { Scenario } from "../types";
import StatusBadge from "./StatusBadge";
import CategoryBadge from "./CategoryBadge";

interface ScenarioCardProps {
  scenario: Scenario;
  onSimulate: (id: string) => void;
}

export default function ScenarioCard({
  scenario,
  onSimulate,
}: ScenarioCardProps) {
  const isExecuting = scenario.status === "executing";

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-white/10 bg-guardz-dark-gray p-5 transition-all ${
        isExecuting
          ? "shadow-[0_0_15px_rgba(101,79,232,0.4)] border-guardz-purple/50"
          : "hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-headline-07 text-white">{scenario.name}</h3>
        <StatusBadge status={scenario.status} />
      </div>

      <p className="text-body-03 font-normal text-guardz-light-gray">
        {scenario.description}
      </p>

      <div className="flex items-center justify-between pt-1">
        <CategoryBadge category={scenario.category} />

        <button
          onClick={() => onSimulate(scenario.id)}
          disabled={isExecuting}
          className="cursor-pointer rounded-lg bg-guardz-purple px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-guardz-purple/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExecuting ? "Running..." : "Simulate"}
        </button>
      </div>

      {scenario.message && (
        <div className="rounded-lg bg-black/30 px-3 py-2 text-xs text-guardz-light-gray">
          {scenario.message}
        </div>
      )}
    </div>
  );
}
