import { motion } from "motion/react";
import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";
import { EASE_OUT, verdictPop } from "../lib/motion";

interface VerdictCardProps {
  scenario: Scenario;
}

export default function VerdictCard({ scenario }: VerdictCardProps) {
  const outcome = getOutcome(scenario.status);
  const seconds = ((scenario.durationMs ?? 800) / 1000).toFixed(1);

  const accent =
    outcome === "executed"
      ? "linear-gradient(90deg,#FC5281,#FF8FAE)"
      : outcome === "protected"
        ? "linear-gradient(90deg,#7659F5,#A289FC)"
        : "linear-gradient(90deg,#8A8A99,#B9B9BE)";

  const circle =
    outcome === "executed"
      ? "linear-gradient(262deg, #FC5281 43.32%, #B0284F 100%)"
      : outcome === "protected"
        ? "var(--gradient-purple)"
        : "linear-gradient(262deg, #6B6B76 43.32%, #3A3A44 100%)";

  const label =
    outcome === "executed"
      ? "Undetected"
      : outcome === "protected"
        ? "Protected"
        : "Didn't run";

  const labelColor =
    outcome === "executed"
      ? "text-guardz-pink"
      : outcome === "protected"
        ? "text-guardz-light-purple"
        : "text-guardz-light-gray";

  const detail =
    outcome === "executed"
      ? `Bypassed your endpoint in ${seconds}s — needs attention`
      : outcome === "protected"
        ? `Blocked by your endpoint in ${seconds}s`
        : "The runner could not start this attack, so it proves nothing about your defenses.";

  return (
    <div className="relative flex flex-col items-center px-14 py-12">
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ transformOrigin: "left", backgroundImage: accent }}
        className="absolute inset-x-0 top-0 h-[3px]"
      />

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="text-card-title text-center text-white"
      >
        {scenario.name}
      </motion.h2>

      <motion.div variants={verdictPop} initial="initial" animate="animate" className="mt-7">
        <div
          className="grid h-[62px] w-[62px] place-items-center rounded-full"
          style={{ backgroundImage: circle }}
        >
          <svg
            className="h-[26px] w-[26px] text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {outcome === "executed" ? (
              <>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </>
            ) : outcome === "protected" ? (
              <path d="M20 6 9 17l-5-5" />
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </>
            )}
          </svg>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: EASE_OUT }}
        className={`text-verdict-label mt-5 ${labelColor}`}
      >
        {label}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18, ease: EASE_OUT }}
        className="mt-2 max-w-[440px] text-center text-[15px] text-guardz-light-gray"
      >
        {detail}
      </motion.p>

      {outcome === "errored" && scenario.message ? (
        <p className="mt-3 max-w-[460px] truncate text-center font-mono text-[12px] text-guardz-light-gray/60">
          {scenario.message}
        </p>
      ) : null}
    </div>
  );
}
