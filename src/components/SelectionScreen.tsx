import { motion } from "motion/react";
import { Scenario } from "../types";
import RailLayout from "./RailLayout";
import TechniqueCard from "./TechniqueCard";
import RailStatCard from "./RailStatCard";
import { listContainer } from "../lib/motion";

interface SelectionScreenProps {
  scenarios: Scenario[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRunSelected: () => void;
  onBack: () => void;
}

export default function SelectionScreen({
  scenarios,
  selectedIds,
  onToggle,
  onToggleAll,
  onRunSelected,
  onBack,
}: SelectionScreenProps) {
  const total = scenarios.length;
  const count = selectedIds.length;
  const allSelected = count === total;
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <RailLayout
      title={
        <>
          Choose the attacks
          <br />
          to simulate
        </>
      }
      subtitle="Pick the attacks you want to test against this endpoint, or run the full suite. Every test is safe and self-cleaning."
      railBottom={
        <RailStatCard
          label="Selected"
          value={`${count} of ${total}`}
          percent={pct}
        />
      }
      railAction={
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-2 text-[13px] leading-4 font-medium text-white/70 transition-colors hover:text-white"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to home
        </button>
      }
    >
      <header className="flex shrink-0 items-center justify-between px-[34px] pt-[26px] pb-4">
        <h2 className="text-section-title text-white">Attack Techniques</h2>
        <button
          onClick={onToggleAll}
          className="btn btn-secondary gap-2 px-[14px] py-2 text-[13px] leading-4"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </header>

      <motion.div
        variants={listContainer}
        initial="initial"
        animate="animate"
        className="scrollbar-slim grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-[14px] overflow-y-auto px-[34px] pt-[2px] pb-3"
      >
        {scenarios.map((scenario) => (
          <TechniqueCard
            key={scenario.id}
            scenario={scenario}
            selected={selectedIds.includes(scenario.id)}
            onToggle={() => onToggle(scenario.id)}
          />
        ))}
      </motion.div>

      <footer className="mt-auto flex shrink-0 items-center justify-between border-t border-[#A289FC33] px-[34px] py-4">
        <span className="text-[14px] leading-[18px] font-medium text-text-dim">
          {count} of {total} attacks selected
        </span>
        <button
          onClick={onRunSelected}
          disabled={count === 0}
          className="btn btn-primary gap-[9px] px-[26px] py-[13px] text-[15px] leading-[18px]"
        >
          Run {count > 0 ? `${count} ` : ""}Selected
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </RailLayout>
  );
}
