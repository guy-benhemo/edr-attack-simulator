import { z } from "zod";

/**
 * Composer document schema.
 *
 * A composer document is a *flow* of typed blocks, not a canvas of absolutely
 * positioned shapes. Every block is a component lifted from the Figma report
 * system, so a document can only ever be assembled out of on-brand parts - there
 * is no generic "rectangle" escape hatch.
 *
 * That flow model is what makes the same document renderable as both a PDF page
 * and an email: a stack of blocks maps onto table-based email HTML, absolute
 * coordinates do not.
 */

const accentTone = z.enum(["amber", "pink", "lavender", "mint"]);

const blockBase = z.object({ id: z.string().min(1) });

/** Display/Headline 03 section title, e.g. "Table of Contents". */
export const headingBlockSchema = blockBase.extend({
  type: z.literal("heading"),
  text: z.string().default("Section heading"),
  /** Trailing words rendered in the opposite purple, as on the Figma TOC page. */
  accentText: z.string().default(""),
  tone: z.enum(["purple", "indigo"]).default("purple"),
  /** Headline 03 (32) for a page title, Headline 05 (22) for a sub-section. */
  size: z.enum(["large", "small"]).default("large"),
});

/** Lavender number chip + Headline 05 title ("1  Clear And Present Danger"). */
export const numberedHeadingBlockSchema = blockBase.extend({
  type: z.literal("numberedHeading"),
  number: z.string().default("1"),
  text: z.string().default("Numbered section heading"),
});

/** Running text/Body 01. Blank lines split paragraphs; **bold** is honoured. */
export const paragraphBlockSchema = blockBase.extend({
  type: z.literal("paragraph"),
  text: z.string().default("Body copy."),
});

/** Table of contents: label + page number with a fading rule beneath each row. */
export const tocBlockSchema = blockBase.extend({
  type: z.literal("toc"),
  entries: z.array(z.object({ label: z.string(), page: z.string() })).default([
    { label: "Executive Summary", page: "3" },
    { label: "Introduction", page: "5" },
    { label: "Key Takeaways", page: "10" },
  ]),
});

/** Numbered points with a lavender square badge (Figma preface page). */
export const numberedListBlockSchema = blockBase.extend({
  type: z.literal("numberedList"),
  items: z.array(z.string()).default(["First point.", "Second point."]),
});

/** Bulleted points. **bold** is honoured, as in "**33%** of business owners…". */
export const bulletListBlockSchema = blockBase.extend({
  type: z.literal("bulletList"),
  lead: z.string().default(""),
  items: z
    .array(z.string())
    .default(["**33%** of business owners handle alerts themselves"]),
});

/** Row of 262x192 stat cards with the notched corner badge. */
export const statCardsBlockSchema = blockBase.extend({
  type: z.literal("statCards"),
  cards: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        tone: accentTone.default("amber"),
      }),
    )
    .default([
      {
        value: "34%",
        label: "have a formal incident response plan",
        tone: "amber",
      },
      { value: "28%", label: "rely on informal processes", tone: "amber" },
      { value: "15%", label: "have no plan at all", tone: "pink" },
      {
        value: "42%",
        label: "are reacting to incidents, rather than preparing",
        tone: "pink",
      },
    ]),
});

/** Column chart inside a white card, with a value pill above each bar. */
export const columnChartBlockSchema = blockBase.extend({
  type: z.literal("columnChart"),
  title: z.string().default("Identified Reasons for Weaknesses"),
  /** Y-axis ceiling in percent; gridlines are drawn every 10. */
  max: z.number().positive().default(50),
  series: z.array(z.object({ label: z.string(), value: z.number() })).default([
    { label: "Of Unapproved 3rd Party Apps In Use", value: 23 },
    { label: "Lack Of Proper Security Policies", value: 32 },
    { label: "Outdated Technologies", value: 42 },
    { label: "Targeted Cybercriminal Attacks", value: 43 },
    { label: "Of Employee Mistakes", value: 45 },
  ]),
});

/** Horizontal bar chart: label column, bar, trailing lavender value pill. */
export const barChartBlockSchema = blockBase.extend({
  type: z.literal("barChart"),
  title: z
    .string()
    .default("What Drives SMBs To Consider Working With An MSP?"),
  max: z.number().positive().default(60),
  series: z.array(z.object({ label: z.string(), value: z.number() })).default([
    { label: "Fear Of Cyberattacks", value: 52 },
    { label: "Responsibility To Protect Customers", value: 40 },
    { label: "Need For Specialized Expertise", value: 30 },
  ]),
});

/** Dark gradient "Why this matters" card. */
export const calloutBlockSchema = blockBase.extend({
  type: z.literal("callout"),
  title: z.string().default("Why this matters"),
  body: z
    .string()
    .default("What the reader should take away from the section above."),
});

/** Pull quote with the oversized purple quote marks and an attribution. */
export const quoteBlockSchema = blockBase.extend({
  type: z.literal("quote"),
  quote: z.string().default("The quote goes here."),
  name: z.string().default("Elli Shlomo"),
  role: z.string().default("Head of Security Research"),
});

/** Portrait + name + role + short bio, on a white card. */
export const authorBioBlockSchema = blockBase.extend({
  type: z.literal("authorBio"),
  name: z.string().default("Elli Shlomo"),
  role: z.string().default("Head of Security Research"),
  bio: z.string().default("A one-line description of the author."),
  /** https URL, or empty for the neutral placeholder. */
  photoUrl: z.string().default(""),
});

/** Two-column lavender cards ("100% Channel Focused", "Fast time-to-Value"). */
export const featureGridBlockSchema = blockBase.extend({
  type: z.literal("featureGrid"),
  features: z.array(z.object({ title: z.string(), body: z.string() })).default([
    { title: "100% Channel Focused", body: "We exclusively sell to partners." },
    { title: "Fast time-to-Value", body: "Guardz deploys within minutes." },
  ]),
});

/** Requirement or price rows x tier columns. */
export const comparisonMatrixBlockSchema = blockBase.extend({
  type: z.literal("comparisonMatrix"),
  title: z.string().default(""),
  note: z.string().default(""),
  tiers: z
    .array(z.string())
    .default(["Starter", "Basic", "Silver", "Gold", "Platinum"]),
  rows: z
    .array(
      z.object({
        label: z.string(),
        /** Booleans render ticks; strings render values such as list prices. */
        checks: z.array(z.union([z.boolean(), z.string()])),
      }),
    )
    .default([
      {
        label: "Executed Partner Agreement",
        checks: [true, true, true, true, true],
      },
      {
        label: "Display Guardz Logo on Website",
        checks: [false, true, true, true, true],
      },
      {
        label: "Partner Portal Training",
        checks: [false, false, true, true, true],
      },
    ]),
});

/**
 * Legacy internal-only block shape. It remains readable at the block level so
 * old internal JSON can be identified, but customer-facing documents reject it
 * in `composerDocumentSchema` below.
 */
export const battlecardBlockSchema = blockBase.extend({
  type: z.literal("battlecard"),
  competitor: z.string().default("Competitor"),
  updatedAt: z.string().default("2026-08-19"),
  sourceLabel: z.string().default("Swan competitive guidance"),
  sourceUrl: z.string().default(""),
  oneLine: z.string().default("What this competitor sells and where it fits."),
  whereTheyWin: z
    .array(z.string())
    .max(5)
    .default(["A genuine strength buyers recognize."]),
  whereTheyLose: z
    .array(z.string())
    .max(5)
    .default(["A sourced limitation or fit gap."]),
  objections: z
    .array(z.object({ objection: z.string(), response: z.string() }))
    .max(6)
    .default([
      {
        objection: "We already use them.",
        response: "Map the remaining workflow gaps before proposing a change.",
      },
    ]),
  winConditions: z
    .array(z.string())
    .max(5)
    .default([
      "The buyer needs connected MSP workflows across security areas.",
    ]),
  dealMoves: z
    .array(z.string())
    .max(5)
    .default([
      "Ask how the team investigates one incident across tools today.",
    ]),
});

/** Closing line + primary/secondary buttons. */
export const ctaBlockSchema = blockBase.extend({
  type: z.literal("cta"),
  lead: z.string().default("See how Guardz supports your MSP business."),
  primaryLabel: z.string().default("Book a Demo"),
  primaryUrl: z.string().default("https://guardz.com/demo"),
  secondaryLabel: z.string().default("Watch On Demand Demo"),
  secondaryUrl: z.string().default(""),
});

export const dividerBlockSchema = blockBase.extend({
  type: z.literal("divider"),
});

export const spacerBlockSchema = blockBase.extend({
  type: z.literal("spacer"),
  height: z.number().min(8).max(400).default(48),
});

export const blockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  numberedHeadingBlockSchema,
  paragraphBlockSchema,
  tocBlockSchema,
  numberedListBlockSchema,
  bulletListBlockSchema,
  statCardsBlockSchema,
  columnChartBlockSchema,
  barChartBlockSchema,
  calloutBlockSchema,
  quoteBlockSchema,
  authorBioBlockSchema,
  featureGridBlockSchema,
  comparisonMatrixBlockSchema,
  battlecardBlockSchema,
  ctaBlockSchema,
  dividerBlockSchema,
  spacerBlockSchema,
]);

export const composerPageSchema = z.object({
  id: z.string().min(1),
  blocks: z.array(blockSchema).default([]),
});

/**
 * The furniture in the dark band at the foot of the sheet. It lives on the
 * document, not the page, so an edit lands on every page at once - including
 * pages the repack mints after the edit.
 */
export const composerFooterSchema = z.object({
  showLogo: z.boolean().default(true),
  showPageNumber: z.boolean().default(true),
});

export const composerDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    /** Runs in the footer band of every page, next to the logo. */
    docTitle: z.string().default("2025 State of SMB Cybersecurity Report"),
    footer: composerFooterSchema.default({
      showLogo: true,
      showPageNumber: true,
    }),
    pages: z.array(composerPageSchema).min(1),
  })
  .superRefine((document, context) => {
    document.pages.forEach((page, pageIndex) => {
      page.blocks.forEach((block, blockIndex) => {
        if (block.type !== "battlecard") return;
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Internal battlecards are not allowed in customer-facing documents.",
          path: ["pages", pageIndex, "blocks", blockIndex],
        });
      });
    });
  });

export type BlockType = z.infer<typeof blockSchema>["type"];
export type Block = z.infer<typeof blockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type ComposerPage = z.infer<typeof composerPageSchema>;
export type ComposerFooter = z.infer<typeof composerFooterSchema>;
export type ComposerDocument = z.infer<typeof composerDocumentSchema>;

export function emptyDocument(): ComposerDocument {
  return composerDocumentSchema.parse({
    schemaVersion: 1,
    pages: [{ id: "page-1", blocks: [] }],
  });
}
