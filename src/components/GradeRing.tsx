import { motion } from "motion/react";
import { EASE_OUT } from "../lib/motion";

interface GradeRingProps {
  /** 0–100 readiness score. */
  score: number;
  grade: string;
  size?: number;
}

export default function GradeRing({ score, grade, size = 112 }: GradeRingProps) {
  const stroke = 3;
  const radius = size / 2 - stroke * 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
        />
      </svg>
      <span className="absolute font-display text-[40px] leading-none font-light text-white/90">
        {grade}
      </span>
    </div>
  );
}
