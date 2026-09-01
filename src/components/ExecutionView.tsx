import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";
import { TARGET_HOST } from "../data/scenarios";
import { EASE_OUT } from "../lib/motion";
import RailLayout from "./RailLayout";
import RailStatCard from "./RailStatCard";
import StepperBar from "./StepperBar";
import ScanningCard from "./ScanningCard";
import VerdictCard from "./VerdictCard";
import CompletedChips from "./CompletedChips";

interface ExecutionViewProps {
  scenarios: Scenario[];
  runQueue: string[];
  currentIndex: number;
  onCancel: () => void;
}

function useElapsed() {
  const startRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const total = Math.floor((now - startRef.current) / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function ExecutionView({
  scenarios,
  runQueue,
  currentIndex,
  onCancel,
}: ExecutionViewProps) {
  const elapsed = useElapsed();

  const queued = runQueue.map((id) => scenarios.find((s) => s.id === id)!);
  const currentScenario = queued[currentIndex];
  const completed = queued.filter(
    (s) =>
      s &&
      (s.status === "completed" ||
        s.status === "blocked" ||
        s.status === "mitigated"),
  );
  const blockedCount = completed.filter(
    (s) => getOutcome(s.status) === "protected",
  ).length;
  const undetectedCount = completed.length - blockedCount;

  const stepNumber = Math.min(currentIndex + 1, runQueue.length);
  const pct = runQueue.length > 0 ? (completed.length / runQueue.length) * 100 : 0;

  const isVerdict =
    currentScenario &&
    (currentScenario.status === "completed" ||
      currentScenario.status === "blocked" ||
      currentScenario.status === "mitigated");

  return (
    <RailLayout
      title={
        <>
          Simulating attacks
          <br />
          on your endpoint
        </>
      }
      subtitle={`Each attack runs safely against ${TARGET_HOST} and reverts itself. Watch how your defenses respond in real time.`}
      railBottom={
        <RailStatCard
          label="Progress"
          value={`Test ${stepNumber} of ${runQueue.length}`}
          percent={pct}
          footer={
            <div className="flex items-center gap-4 text-[13px] leading-4 text-white/75">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C7B6FF]" />
                {blockedCount} Blocked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-guardz-pink" />
                {undetectedCount} Undetected
              </span>
            </div>
          }
        />
      }
      railAction={
        <button
          onClick={onCancel}
          className="flex cursor-pointer items-center gap-2 text-[13px] leading-4 font-medium text-white/70 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          Cancel simulation
        </button>
      }
    >
      <header className="flex shrink-0 items-center px-[34px] pt-6">
        <span className="font-mono text-[13px] text-guardz-light-gray">
          {elapsed} elapsed
        </span>
      </header>

      <div className="mt-4 shrink-0 px-[34px]">
        <StepperBar scenarios={scenarios} runQueue={runQueue} />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-[34px]">
        <div className="relative w-full max-w-[640px] overflow-hidden rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(27,21,46,0.72),rgba(14,11,30,0.72))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
          <AnimatePresence mode="wait">
            {currentScenario && (
              <motion.div
                key={`${currentScenario.id}-${isVerdict ? "verdict" : "scanning"}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                {isVerdict ? (
                  <VerdictCard scenario={currentScenario} />
                ) : (
                  <ScanningCard
                    scenario={currentScenario}
                    index={currentIndex}
                    total={runQueue.length}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CompletedChips completed={completed} />
    </RailLayout>
  );
}
