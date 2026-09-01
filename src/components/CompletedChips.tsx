import { AnimatePresence, motion } from "motion/react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";
import { chipIn } from "../lib/motion";

interface CompletedChipsProps {
  completed: Scenario[];
}

export default function CompletedChips({ completed }: CompletedChipsProps) {
  if (completed.length === 0) return null;

  const recent = [...completed].reverse().slice(0, 4);

  return (
    <div className="shrink-0 px-[34px] pb-7">
      <p className="text-[13px] font-semibold text-guardz-light-gray">
        Recently completed
      </p>

      <div className="mt-3 flex items-stretch gap-3">
        <AnimatePresence initial={false}>
          {recent.map((scenario) => {
            const undetected = getOutcome(scenario.status) === "executed";

            return (
              <motion.div
                key={scenario.id}
                layout
                variants={chipIn}
                initial="initial"
                animate="animate"
                className={`flex w-[240px] min-w-0 shrink-0 items-center gap-3 rounded-[12px] border px-3.5 py-2.5 ${
                  undetected
                    ? "border-guardz-pink/35 bg-guardz-pink/[0.08]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span
                  className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[9px] ${
                    undetected ? "bg-guardz-pink/25" : "bg-guardz-purple/30"
                  }`}
                >
                  {undetected ? (
                    <svg
                      className="h-3.5 w-3.5 text-guardz-pink"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ) : (
                    <svg
                      className="h-3.5 w-3.5 text-guardz-light-purple"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] font-semibold text-white">
                    {scenario.name}
                  </span>
                  <span
                    className={`text-[12px] font-medium ${
                      undetected
                        ? "text-guardz-pink"
                        : "text-guardz-light-purple"
                    }`}
                  >
                    {undetected ? "Undetected" : "Blocked"}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
