import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";
import ScoreRing from "./ScoreRing";
import ResultRow from "./ResultRow";

interface ResultsScreenProps {
  scenarios: Scenario[];
  runQueue: string[];
  onRunAgain: () => void;
  onBackToWelcome: () => void;
}

export default function ResultsScreen({
  scenarios,
  runQueue,
  onRunAgain,
  onBackToWelcome,
}: ResultsScreenProps) {
  const ranScenarios = runQueue.map(
    (id) => scenarios.find((s) => s.id === id)!,
  );
  const executed = ranScenarios.filter(
    (s) => getOutcome(s.status) === "executed",
  ).length;
  const stopped = ranScenarios.filter(
    (s) => getOutcome(s.status) === "stopped",
  ).length;
  const total = ranScenarios.length;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 flex-col items-center gap-6 border-b border-white/10 px-8 py-10 animate-fade-in">
        <ScoreRing executed={stopped} total={total} />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-headline-04 text-white">
            {stopped}/{total} Attacks Blocked
          </h2>
          {executed > 0 && (
            <p className="text-sm text-guardz-pink">
              {executed} scenario{executed > 1 ? "s" : ""} bypassed endpoint
              protection
            </p>
          )}
          {stopped === total && (
            <p className="text-sm text-guardz-green">
              All attacks were detected and blocked
            </p>
          )}
          <p className="mt-1 max-w-md text-center text-xs text-guardz-medium-gray">
            Review undetected scenarios to identify protection gaps in your
            endpoint security.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRunAgain}
            className="cursor-pointer rounded-lg bg-guardz-green px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-guardz-green/90"
          >
            Run Again
          </button>
          <button
            onClick={onBackToWelcome}
            className="cursor-pointer rounded-lg border border-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/5"
          >
            Back to Home
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {ranScenarios.map((scenario, idx) => (
          <ResultRow key={scenario.id} scenario={scenario} index={idx} />
        ))}
      </div>
    </div>
  );
}
