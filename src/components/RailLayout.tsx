import { ReactNode } from "react";
import { motion } from "motion/react";
import GuardzMark from "./GuardzMark";
import GridBackdrop from "./GridBackdrop";
import { heroContainer, heroItem } from "../lib/motion";

interface RailLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  railMiddle?: ReactNode;
  railBottom?: ReactNode;
  railAction?: ReactNode;
  children: ReactNode;
}

export default function RailLayout({
  title,
  subtitle,
  eyebrow,
  railMiddle,
  railBottom,
  railAction,
  children,
}: RailLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className="relative flex w-[392px] shrink-0 flex-col justify-between overflow-hidden px-[38px] py-10"
        style={{ backgroundImage: "var(--gradient-purple)" }}
      >
        <div className="pointer-events-none absolute -top-24 -left-16 h-[340px] w-[340px] rounded-full bg-white/10 blur-[120px]" />

        <motion.div
          variants={heroContainer}
          initial="initial"
          animate="animate"
          className="relative flex flex-col gap-6"
        >
          <motion.div variants={heroItem}>
            <GuardzMark size={34} radius={8} />
          </motion.div>

          <div className="flex flex-col gap-4">
            <motion.h1
              variants={heroItem}
              className="text-rail-title text-white"
            >
              {title}
            </motion.h1>

            {eyebrow && (
              <motion.p
                variants={heroItem}
                className="text-[13px] leading-4 font-medium tracking-[0.14em] text-white/60 uppercase"
              >
                {eyebrow}
              </motion.p>
            )}

            {subtitle && (
              <motion.p
                variants={heroItem}
                className="text-[15px] leading-[23px] text-white/75"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </motion.div>

        {railMiddle && <div className="relative">{railMiddle}</div>}

        <div className="relative flex flex-col gap-[18px]">
          {railBottom}
          {railAction}
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-[#0B0819]">
        <GridBackdrop />
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
