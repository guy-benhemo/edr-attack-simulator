import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";

const executingMessages = [
  "Executing attack technique…",
  "Testing endpoint defenses…",
  "Checking if protection holds…",
  "Probing for security gaps…",
];

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
  const outcome = getOutcome(scenario.status);
  const showResult = !isRunning && scenario.status !== "ready";

  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * 4));

  useEffect(() => {
    if (!isRunning) {
      setMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % executingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="flex max-w-xl flex-col items-center gap-8 px-8 text-center animate-fade-in">
      <div className="text-sm font-medium tracking-widest text-guardz-medium-gray uppercase">
        Test {index + 1} of {total}
      </div>

      <h2 className="text-headline-04 text-white">{scenario.name}</h2>

      <p className="text-body-01 text-guardz-light-gray">{scenario.question}</p>

      {isRunning && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="relative h-1 w-64 overflow-hidden rounded-full bg-white/5">
            <div className="absolute inset-0 rounded-full bg-guardz-purple animate-scan-line" />
          </div>
          <span className="relative inline-flex h-5 items-center justify-center overflow-hidden text-sm text-guardz-light-purple">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={msgIndex}
                initial={{ y: -20, filter: "blur(6px)", opacity: 0 }}
                animate={{ y: 0, filter: "blur(0px)", opacity: 1 }}
                exit={{ y: 20, filter: "blur(6px)", opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-block whitespace-nowrap"
              >
                {executingMessages[msgIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      )}

      {showResult && (
        <div className="flex flex-col items-center gap-3 animate-verdict">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              outcome === "executed"
                ? "bg-guardz-pink/15"
                : "bg-guardz-green/15"
            }`}
          >
            <span
              className={`text-2xl ${
                outcome === "executed"
                  ? "text-guardz-pink"
                  : "text-guardz-green"
              }`}
            >
              {outcome === "executed" ? "⚠" : "✓"}
            </span>
          </div>
          <span
            className={`text-headline-05 font-bold tracking-wider ${
              outcome === "executed"
                ? "text-guardz-pink"
                : "text-guardz-green"
            }`}
          >
            {outcome === "executed" ? "UNDETECTED" : "PROTECTED"}
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
