import { motion } from "motion/react";
import GuardzMark from "./GuardzMark";
import GridBackdrop from "./GridBackdrop";
import { heroContainer, heroItem, heroMark } from "../lib/motion";

interface WelcomeScreenProps {
  onRunAll: () => void;
  onSelectIndividual: () => void;
}

export default function WelcomeScreen({
  onRunAll,
  onSelectIndividual,
}: WelcomeScreenProps) {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0B0819]">
      <GridBackdrop intensity="hero" />

      <motion.div
        variants={heroContainer}
        initial="initial"
        animate="animate"
        className="relative flex flex-col items-center gap-[26px] px-10"
      >
        <motion.div variants={heroMark}>
          <GuardzMark size={74} radius={20} />
        </motion.div>

        <div className="flex flex-col items-center gap-[18px]">
          <motion.h1
            variants={heroItem}
            className="text-display-hero text-center text-white"
          >
            EDR Attack Simulator
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="max-w-[520px] text-center text-[17px] leading-[27px] text-text-soft"
          >
            Test your endpoint protection against real attack techniques. See
            exactly where you are covered, and what gaps to close.
          </motion.p>
        </div>

        <motion.div
          variants={heroItem}
          className="mt-[8px] flex items-center gap-[14px]"
        >
          <button
            onClick={onRunAll}
            className="btn btn-primary gap-[10px] px-[32px] py-[15px] text-[16px] leading-[20px]"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.5 2.5v11l9-5.5-9-5.5z" />
            </svg>
            Run full scan
          </button>

          <button
            onClick={onSelectIndividual}
            className="btn btn-secondary px-[28px] py-[15px] text-[16px] leading-[20px]"
          >
            Select individual tests
          </button>
        </motion.div>
      </motion.div>

      <motion.figure
        variants={heroItem}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.35 }}
        className="absolute bottom-[104px] flex max-w-[720px] items-center gap-5 px-10"
      >
        <img
          src="/elli.png"
          alt="Elli Shlomo"
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          style={{ objectPosition: "center 22%" }}
        />
        <div className="flex flex-col gap-[7px]">
          <blockquote className="text-[15px] leading-[24px] text-white/65">
            &ldquo;We built this test so MSPs can see precisely where their EDR
            falls short, from missed detections to response gaps, measured
            against real-world attacks&rdquo;.
          </blockquote>
          <figcaption className="flex items-center gap-2 text-[13px] leading-4">
            <span className="font-medium text-guardz-light-purple">
              Elli Shlomo
            </span>
            <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-white/25" />
            <span className="text-white/40">Head of Security Research</span>
          </figcaption>
        </div>
      </motion.figure>

      <div className="absolute bottom-[30px] flex items-center gap-2">
        <span className="text-[13px] leading-4 text-white/50">Powered by</span>
        <img src="/logo.png" alt="Guardz" className="h-[19px]" />
      </div>
    </div>
  );
}
