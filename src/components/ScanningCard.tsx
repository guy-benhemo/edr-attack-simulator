import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Scenario } from "../types";
import { statusSwap } from "../lib/motion";

const MESSAGES = [
  "Probing for security gaps...",
  "Testing endpoint defenses...",
  "Watching for detection response...",
  "Measuring mitigation behaviour...",
];

interface ScanningCardProps {
  scenario: Scenario;
  index: number;
  total: number;
}

export default function ScanningCard({
  scenario,
  index,
  total,
}: ScanningCardProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMessageIndex((i) => (i + 1) % MESSAGES.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center px-14 py-11">
      <div className="flex items-center gap-3.5">
        <span className="rounded-full bg-guardz-light-purple/18 px-2.5 py-1 text-[12px] font-medium text-guardz-bright-purple">
          {scenario.category}
        </span>
        <span className="text-[14px] text-guardz-light-gray">
          Test {index + 1} of {total}
        </span>
      </div>

      <h2 className="text-card-title mt-5 text-center text-white">
        {scenario.name}
      </h2>

      <p className="mt-3 text-center text-[16px] leading-[24px] text-guardz-light-gray">
        {scenario.question}
      </p>

      <div className="relative mt-8 h-[5px] w-[340px] overflow-hidden rounded-full bg-white/8">
        <div className="animate-scan-sweep absolute inset-y-0 left-0 w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,#7659F5_35%,#A289FC_65%,transparent)]" />
      </div>

      <div className="mt-5 h-[24px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            variants={statusSwap}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-[15px] text-guardz-light-purple"
          >
            {MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
