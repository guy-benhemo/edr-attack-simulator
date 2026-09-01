import { ReactNode } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";

interface RailStatCardProps {
  label: string;
  value: ReactNode;
  /** 0–100 fill for the track. */
  percent: number;
  footer?: ReactNode;
}

/**
 * The translucent card in the side rail — "Selected 5 of 9" on A2 and
 * "Progress · Test 5 of 9" on A3/A4/A5. Both share one spec.
 */
export default function RailStatCard({
  label,
  value,
  percent,
  footer,
}: RailStatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-white/[0.16] bg-white/[0.08] px-[18px] py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] leading-4 font-medium text-white/75">
          {label}
        </span>
        <span className="font-display text-[18px] leading-[22px] font-bold text-white/55">
          {value}
        </span>
      </div>

      <div className="relative h-[6px] overflow-hidden rounded-full bg-white/[0.16]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(in oklab 90deg, oklab(70.2% 0.061 -0.153) 0%, oklab(54.3% 0.049 -0.214) 100%)",
          }}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
        />
      </div>

      {footer}
    </div>
  );
}
