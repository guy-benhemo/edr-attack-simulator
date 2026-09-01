/**
 * The inline markup understood inside block text fields.
 *
 * Shared by both renderers - `block-views.tsx` for HTML and `ComposerPdf.tsx`
 * for react-pdf - so the two cannot disagree about what counts as markup. Split
 * a string on `INLINE_MARKUP`, then test each part: `**…**` is bold, and
 * `LINK_MARKUP` matches `[label](url)` capturing the label and the URL.
 */
export const INLINE_MARKUP = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export const LINK_MARKUP = /^\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * The `capitalize` text-transform the editor puts on callout titles. CSS only
 * touches the first letter of each word and leaves the rest alone, so this does
 * the same; react-pdf has no text-transform, so it has to happen in JS to keep
 * the two renderers agreeing.
 */
export const capitalizeWords = (text: string) =>
  text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
