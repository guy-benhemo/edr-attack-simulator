import { useState } from "react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";

interface ResultRowProps {
  scenario: Scenario;
  index: number;
}

export default function ResultRow({ scenario, index }: ResultRowProps) {
  const [expanded, setExpanded] = useState(false);
  const outcome = getOutcome(scenario.status);

  const badgeConfig = {
    executed: { label: "Undetected", style: "bg-guardz-pink/15 text-guardz-pink" },
    stopped: { label: "Protected", style: "bg-guardz-green/15 text-guardz-green" },
    error: { label: "Error", style: "bg-guardz-pink/15 text-guardz-pink" },
    pending: { label: "Pending", style: "bg-white/10 text-white/50" },
  }[outcome];

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="w-6 text-center text-sm font-medium text-guardz-medium-gray">
          {index + 1}
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-white">
            {scenario.name}
          </span>
          <span className="text-xs text-guardz-medium-gray">
            {scenario.question}
          </span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeConfig.style}`}
        >
          {badgeConfig.label}
        </span>
        <svg
          className={`h-4 w-4 text-guardz-medium-gray transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "200px" : "0px" }}
      >
        <div className="flex flex-col gap-1.5 px-5 pb-4 pl-16 text-xs">
          {scenario.message && (
            <div className="text-guardz-light-gray">{scenario.message}</div>
          )}
          {scenario.exitCode !== undefined && (
            <div className="text-guardz-medium-gray">
              Exit code: {scenario.exitCode}
            </div>
          )}
          {scenario.durationMs !== undefined && (
            <div className="text-guardz-medium-gray">
              Duration: {(scenario.durationMs / 1000).toFixed(1)}s
            </div>
          )}
          {scenario.stdout && (
            <div className="text-guardz-medium-gray">
              <span className="text-guardz-green">stdout:</span>{" "}
              <span className="font-mono">{scenario.stdout.slice(0, 300)}</span>
            </div>
          )}
          {scenario.stderr && (
            <div className="text-guardz-medium-gray">
              <span className="text-guardz-pink">stderr:</span>{" "}
              <span className="font-mono">{scenario.stderr.slice(0, 300)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
