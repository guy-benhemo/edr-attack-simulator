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
          className="cursor-pointer rounded-lg bg-guardz-green px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-guardz-green/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExecuting ? "Running..." : "Simulate"}
        </button>
      </div>

      {scenario.message && (
        <div className="flex flex-col gap-1 rounded-lg bg-black/30 px-3 py-2 text-xs">
          <div className="text-guardz-light-gray">{scenario.message}</div>
          {scenario.status === "mitigated" && (
            <div className="mt-1 rounded bg-guardz-amber/10 px-2 py-1 text-guardz-amber">
              S1 terminated the process before completion
            </div>
          )}
          {scenario.exitCode !== undefined && (
            <div className="text-guardz-medium-gray">
              Exit code: {scenario.exitCode}
            </div>
          )}
          {scenario.stdout && (
            <div className="text-guardz-medium-gray">
              <span className="text-guardz-green">stdout:</span>{" "}
              {scenario.stdout.slice(0, 300)}
            </div>
          )}
          {scenario.stderr && (
            <div className="text-guardz-medium-gray">
              <span className="text-guardz-pink">stderr:</span>{" "}
              {scenario.stderr.slice(0, 300)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
