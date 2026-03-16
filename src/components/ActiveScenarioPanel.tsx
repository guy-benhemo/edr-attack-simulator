import { Scenario } from "../types";
import { getVerdict } from "../utils/verdict";

interface ActiveScenarioPanelProps {
  scenario: Scenario;
  index: number;
  total: number;
}

export default function ActiveScenarioPanel({
  scenario,
  index,
  total,
}: ActiveScenarioPanelProps) {
  const isRunning = scenario.status === "executing";
  const verdict = getVerdict(scenario.status);
  const showVerdict = verdict !== "pending" && !isRunning;

  return (
    <div className="flex max-w-xl flex-col items-center gap-8 px-8 text-center animate-fade-in">
      <div className="text-sm font-medium tracking-widest text-guardz-medium-gray uppercase">
        Test {index + 1} of {total}
      </div>

      <h2 className="text-headline-04 text-white">{scenario.name}</h2>

      <p className="text-body-01 text-guardz-light-gray">
        {scenario.question}
      </p>

      {isRunning && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="relative h-1 w-64 overflow-hidden rounded-full bg-white/5">
            <div className="absolute inset-0 rounded-full bg-guardz-purple animate-scan-line" />
          </div>
          <span className="text-sm text-guardz-light-purple">
            Executing scenario...
          </span>
        </div>
      )}

      {showVerdict && (
        <div className="flex flex-col items-center gap-3 animate-verdict">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              verdict === "detected"
                ? "bg-guardz-green/15"
                : "bg-guardz-pink/15"
            }`}
          >
            <span
              className={`text-2xl ${
                verdict === "detected"
                  ? "text-guardz-green"
                  : "text-guardz-pink"
              }`}
            >
              {verdict === "detected" ? "✓" : "✕"}
            </span>
          </div>
          <span
            className={`text-headline-05 font-bold tracking-wider ${
              verdict === "detected"
                ? "text-guardz-green"
                : "text-guardz-pink"
            }`}
          >
            {verdict === "detected" ? "DETECTED" : "NOT DETECTED"}
          </span>
          {scenario.durationMs !== undefined && (
            <span className="text-xs text-guardz-medium-gray">
              {(scenario.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
