/**
 * Design tokens for the block composer.
 *
 * Extracted from the "PDF maker 21-7-26" Figma section (file 0QDwLheOgzHXep0QJbZO7d,
 * node 641:126) - the 2025 State of SMB Cybersecurity Report and the Guardz
 * Distribution Partner Program pages. The composer's blocks are the components
 * on those pages, so the token names mirror Figma's published styles.
 *
 * This is the whole palette for the app. It is wider than the seven-colour brand
 * set the removed one-pager used, because the report system needs three extra
 * purples (S-purple-01, S-purple-05, S-purple-07).
 */

/** Figma: Primary/* and Secondary/* fills. */
export const COLORS = {
  white: "#FFFFFF",
  /** Secondary/S-purple-01 - deep indigo. Stat figures, bar fills, matrix ticks. */
  indigo: "#2F2472",
  /** Secondary/S-purple-07 - near-black indigo. Footer band, callout gradient. */
  ink: "#1B153E",
  /** Guardz purple. Headings, primary CTA, focus rings. */
  purple: "#654FE8",
  /** Secondary/S-purple-05 - light purple. Rules, dashed matrix guides. */
  purpleLight: "#A289FC",
  /** Secondary/S-purple-06 - lavender. Number badges, feature cards, value pills. */
  lavender: "#F1EDFF",
  /** Secondary/S-purple-06 at 50% alpha. Shared feature-grid card surface. */
  lavender50: "rgba(241, 237, 255, 0.5)",
  /** Primary/P-dark blue - body copy. */
  body: "#363844",
  /** Secondary/S-light-02 */
  line: "#E6E6E6",
  /** Secondary/S-light-04 */
  muted: "#B9B9BE",
  /** Secondary/S-light-05 - page background base. */
  offWhite: "#FAF9F6",
} as const;

export type ColorToken = keyof typeof COLORS;

/** Accent pairs for the stat-card corner badge (Figma: 60x48, rounded-bl/tr 16). */
export const ACCENT_TONES = {
  amber: { badge: "#FFE2C8", icon: "#F0932B" },
  pink: { badge: "#FFD9E0", icon: "#F0466E" },
  lavender: { badge: "#F1EDFF", icon: "#654FE8" },
  mint: { badge: "#D6F7E8", icon: "#12B981" },
} as const;

export type AccentTone = keyof typeof ACCENT_TONES;

/**
 * Figma text styles. Sizes are in page units (the page is drawn at 1224x1584,
 * i.e. US Letter at 144dpi), so they map 1:1 to CSS px on the unscaled page.
 */
export const TYPE = {
  /** Display/Headline 03 - Red Hat Display ExtraBold 32/48, +1 tracking. */
  headline: {
    fontFamily: "var(--font-red-hat-display)",
    fontSize: 32,
    lineHeight: "48px",
    fontWeight: 800,
    letterSpacing: "1px",
  },
  /** Display/Headline 05 - Red Hat Display ExtraBold 22/38, +1 tracking. */
  subhead: {
    fontFamily: "var(--font-red-hat-display)",
    fontSize: 22,
    lineHeight: "38px",
    fontWeight: 800,
    letterSpacing: "1px",
  },
  /** Running text/Body 01 - Inter Regular 20/36, +0.5 tracking. */
  body: {
    fontFamily: "var(--font-inter)",
    fontSize: 20,
    lineHeight: "36px",
    fontWeight: 400,
    letterSpacing: "0.5px",
  },
  /** Inter Regular 16/1.5, +0.5 tracking - stat labels, chart axis, fine print. */
  small: {
    fontFamily: "var(--font-inter)",
    fontSize: 16,
    lineHeight: 1.5,
    fontWeight: 400,
    letterSpacing: "0.5px",
  },
  /** Inter Bold 78/78, +0.7 tracking - the stat-card figure. */
  figure: {
    fontFamily: "var(--font-inter)",
    fontSize: 78,
    lineHeight: "78px",
    fontWeight: 700,
    letterSpacing: "0.7px",
  },
} as const;

/** US Letter at 144dpi, matching the Figma page frames. */
export const PAGE = {
  width: 1224,
  height: 1584,
  /** Left/right content inset. Content column is 1096 wide. */
  marginX: 64,
  marginTop: 64,
  /** Full-bleed dark footer band pinned to the bottom of every page. */
  footerHeight: 78,
} as const;

export const CONTENT_WIDTH = PAGE.width - PAGE.marginX * 2;
/** Space between consecutive blocks in the content column. */
export const BLOCK_GAP = 24;
/** Vertical room for blocks before they collide with the footer band. */
export const CONTENT_HEIGHT =
  PAGE.height - PAGE.marginTop - PAGE.footerHeight - 24;

/** Figma: shadow on every white card. */
export const CARD_SHADOW = "0px 0px 32px 0px rgba(101, 79, 232, 0.15)";

/** Figma: Linear/Linear - Purple Background, used by the callout card. */
export const CALLOUT_GRADIENT =
  "linear-gradient(-5.22deg, #1B153E 25.885%, #1B153E 42.124%, #654FE8 131.1%)";

/** Page background: off-white with the two soft purple ellipses bled in. */
export const PAGE_BACKGROUND =
  "radial-gradient(120% 80% at 100% 100%, rgba(101,79,232,0.10) 0%, rgba(101,79,232,0) 60%), " +
  "radial-gradient(70% 50% at 0% 0%, rgba(162,137,252,0.10) 0%, rgba(162,137,252,0) 70%), " +
  "#FAF9F6";
