import { motion } from "motion/react";
import { Scenario } from "../types";
import { getOutcome, isSettled } from "../utils/verdict";
import { EASE_OUT } from "../lib/motion";

interface StepperBarProps {
  scenarios: Scenario[];
  runQueue: string[];
}

const FILL: Record<string, string> = {
  executed: "linear-gradient(90deg,#FC5281,#FF7BA0)",
  protected: "linear-gradient(90deg,#7659F5,#A289FC)",
  errored: "linear-gradient(90deg,#8A8A99,#B9B9BE)",
};

export default function StepperBar({ scenarios, runQueue }: StepperBarProps) {
  return (
    <div className="flex items-center gap-2">
      {runQueue.map((id) => {
        const scenario = scenarios.find((s) => s.id === id);
        const status = scenario?.status ?? "ready";
        const isActive = status === "executing";
        const done = isSettled(status);

        return (
          <div
            key={id}
            className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/8"
          >
            {(isActive || done) && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isActive ? 0.55 : 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                style={{
                  transformOrigin: "left",
                  backgroundImage: done
                    ? FILL[getOutcome(status)]
                    : FILL.protected,
                }}
                className="h-full rounded-full"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
