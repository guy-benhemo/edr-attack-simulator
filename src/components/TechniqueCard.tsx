import { motion } from "motion/react";
import { Scenario } from "../types";
import { EASE_OUT, listItem } from "../lib/motion";

interface TechniqueCardProps {
  scenario: Scenario;
  selected: boolean;
  onToggle: () => void;
}

export default function TechniqueCard({
  scenario,
  selected,
  onToggle,
}: TechniqueCardProps) {
  return (
    <motion.button
      variants={listItem}
      onClick={onToggle}
      aria-pressed={selected}
      style={{
        backgroundImage: selected
          ? "var(--gradient-tile-on)"
          : "var(--gradient-tile-off)",
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? "#A289FCB3" : "#A289FC4D",
      }}
      className="flex w-full cursor-pointer flex-col items-stretch gap-[7px] rounded-[18px] border-solid px-4 py-3.5 text-left transition-colors duration-200"
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] leading-[14px] font-semibold text-[#C9BCFF]"
          style={{ backgroundColor: selected ? "#A289FC2E" : "#A289FC24" }}
        >
          {scenario.category}
        </span>

        {selected ? (
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
            style={{ backgroundImage: "var(--gradient-purple)" }}
          >
            <motion.svg
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="h-3 w-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </motion.svg>
          </span>
        ) : (
          <span
            className="inline-block h-[22px] w-[22px] shrink-0 rounded-full border-solid"
            style={{ borderWidth: 1.5, borderColor: "#A289FC80" }}
          />
        )}
      </div>

      <h3 className="text-[16px] leading-[20px] font-bold text-white">
        {scenario.name}
      </h3>

      <p className="text-[13px] leading-[18px] text-text-dim">
        {scenario.question}
      </p>

      <span className="mt-px font-mono text-[11px] leading-[14px] text-[#A289FC99]">
        {scenario.mitreId}
      </span>
    </motion.button>
  );
}
