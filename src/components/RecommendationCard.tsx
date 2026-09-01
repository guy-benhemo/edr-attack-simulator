import { motion } from "motion/react";
import { Recommendation, Scenario } from "../types";
import { listItem } from "../lib/motion";

interface RecommendationCardProps {
  scenario: Scenario;
  recommendation: Recommendation;
  onPlanFix: () => void;
}

export default function RecommendationCard({
  scenario,
  recommendation,
  onPlanFix,
}: RecommendationCardProps) {
  const high = recommendation.severity === "High";

  return (
    <motion.article
      variants={listItem}
      className="relative flex items-center gap-6 overflow-hidden rounded-[14px] border border-white/8 bg-white/[0.02] py-4 pr-5 pl-6"
    >
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${
          high ? "bg-guardz-pink" : "bg-guardz-pink/60"
        }`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
              high
                ? "bg-guardz-pink/18 text-guardz-pink"
                : "bg-guardz-pink/12 text-guardz-pink/85"
            }`}
          >
            {recommendation.severity} severity
          </span>
          <h3 className="text-[16px] font-bold text-white">{scenario.name}</h3>
          <span className="font-mono text-[12px] text-guardz-light-gray/70">
            {scenario.mitreId}
          </span>
        </div>

        <p className="text-[15px] leading-[22px] text-guardz-light-gray">
          {recommendation.action}
        </p>

        <p className="text-[13px] text-guardz-medium-gray">
          Impact: {recommendation.impact}
        </p>
      </div>

      <button
        onClick={onPlanFix}
        className="btn btn-secondary shrink-0 px-4 py-2 text-[13px] leading-4"
      >
        Plan fix
      </button>
    </motion.article>
  );
}
