import { motion } from "motion/react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";
import { EASE_OUT } from "../lib/motion";

interface StepperBarProps {
  scenarios: Scenario[];
  runQueue: string[];
}

export default function StepperBar({ scenarios, runQueue }: StepperBarProps) {
  return (
    <div className="flex items-center gap-2">
      {runQueue.map((id) => {
        const scenario = scenarios.find((s) => s.id === id);
        const status = scenario?.status ?? "ready";
        const isActive = status === "executing";
        const isDone =
          status === "completed" || status === "blocked" || status === "mitigated";
        const undetected = isDone && getOutcome(status) === "executed";

        return (
          <div
            key={id}
            className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/8"
          >
            {(isActive || isDone) && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isActive ? 0.55 : 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                style={{ transformOrigin: "left" }}
                className={`h-full rounded-full ${
                  undetected
                    ? "bg-[linear-gradient(90deg,#FC5281,#FF7BA0)]"
                    : "bg-[linear-gradient(90deg,#7659F5,#A289FC)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
