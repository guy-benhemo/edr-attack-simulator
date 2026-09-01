import type { Variants } from "motion/react";

/**
 * Restrained motion: opacity and small offsets only.
 * Entrances ease-out · UI micro 200–400ms · list stagger 60ms.
 * Springs, blur, shake and sheen were removed deliberately — the only looping
 * animations left are the ones that carry meaning (scan bar, live dot).
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const STAGGER = 0.06;

/** Global · Step transition — crossfade + slide up 12px. */
export const stepTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT, when: "beforeChildren" },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Hero / rail entrance — 400ms, 60ms stagger. */
export const heroContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: STAGGER, delayChildren: 0.08 },
  },
};

export const heroItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** The mark settles in without a bounce. */
export const heroMark: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** Lists and cards — 300ms, 60ms stagger, slide up 10px. */
export const listContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: STAGGER } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
};

/** Simple fade-up, used where a card previously slid in from the side. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** Scanning · status message swap — a plain crossfade with a small offset. */
export const statusSwap: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.25, ease: EASE_OUT },
  },
};

/** Verdict reveal — a restrained settle, no overshoot. */
export const verdictPop: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
};

/** Completed result chip. */
export const chipIn: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
};
