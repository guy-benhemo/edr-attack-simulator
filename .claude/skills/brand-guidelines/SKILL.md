---
name: brand-guidelines
description: >
  Guardz brand guidelines, product content, and visual identity reference.
  Use this skill whenever building or modifying UI components, pages, layouts, or
  styling for the Guardz product. Also use when creating marketing content, landing
  pages, email templates, presentations, or any visual asset that needs to align with
  the Guardz brand. Triggers on: color choices, font selection, typography decisions,
  tone of voice for copy, logo usage, icon styling, illustration direction, writing
  product descriptions, feature copy, security module descriptions, or any question
  about "how should this look", "what colors/fonts to use", or "how should we describe
  this feature" in the Guardz context. Even if the user doesn't mention "brand"
  explicitly, use this skill when making design or content decisions for the Guardz
  product.
---

# Guardz Brand Guidelines

This skill contains the complete Guardz brand identity system. Use it to ensure all
UI, design, and marketing work stays consistent with the brand.

## Quick Reference

### Brand Colors

**Primary palette — use these as your foundation:**

| Name   | Hex       | Usage                        |
|--------|-----------|------------------------------|
| Purple | `#654FE8` | Main brand color             |
| Black  | `#000000` | Text, dark backgrounds       |
| White  | `#FFFFFF` | Backgrounds, text on dark    |
| Green  | `#4FE882` | Accents, CTAs, success states|

**Secondary palette — use to complement, never dominate:**

| Name         | Hex       | Usage                              |
|--------------|-----------|------------------------------------|
| Dark Purple  | `#2f2472` | Deep backgrounds, gradients        |
| Dark Gray    | `#363844` | Secondary text, dark UI elements   |
| Medium Gray  | `#686A73` | Muted text, borders                |
| Light Gray   | `#B9B9BE` | Disabled states, dividers          |
| Cream        | `#eae8dc` | Warm backgrounds                   |
| Teal Green   | `#00AA67` | Secondary green accent             |
| Bright Green | `#00D782` | Highlights, positive indicators    |
| Mint Green   | `#40FEAE` | Vibrant accents                    |
| Light Purple | `#A289FC` | Soft purple accent                 |
| Lavender     | `#F1EDFF` | Light purple backgrounds           |
| Off White    | `#FAF9F6` | Page backgrounds                   |
| Dark Red     | `#B0284F` | Secured/safe states                |
| Pink         | `#FC5281` | Warning accents                    |

**Color usage rules:**
- Purple (#654FE8) is the core brand element — use it prominently but not overwhelmingly
- Balance primary colors with secondary ones
- Context-specific: red tones for "secured" states, green/purple for "risk" states
- Never let secondary colors dominate over primary

### Typography

**Display font** (headings, hero text): `Red Hat Display` — Bold, Medium, Regular
**Running text** (body, UI labels): `Inter` — Bold, Medium, Regular

Both fonts are already configured in the project:
- CSS variable `--font-display` → Red Hat Display
- CSS variable `--font-sans` / `--default-font-family` → Inter

**Tailwind usage:**
- `font-display` for headings
- `font-sans` (default) for body text

**Rules:**
- Use Title Case for headlines
- Use consistent font weight and color for emphasis
- Never use ALL CAPS for emphasis

### Logo

- Minimum margin: 32px all sides, 40px bottom
- Minimum height: 24px
- Variations: Dark, Light, App icon
- Never remove the dot, rotate, display in single color, distort, or change colors

## Tone of Voice

When writing copy, UI text, error messages, or any user-facing content, follow these principles:

**We've Got Your Back** — Be friendly and accessible. Use conversational language that
makes MSPs feel supported. Avoid jargon without explanation, overly formal tone, or
overcomplicated messaging.

**Confident & Capable** — Use assertive language that instills confidence. Clearly
articulate benefits and strengths. Never undersell capabilities or use hesitant language.

**Partner Up For Success** — Frame everything as a partnership. Collaborate openly,
provide consistent support, and align goals. Never focus solely on Guardz's success.

**Clear & Respectful** — Use precise language. Respect the expertise of MSPs.
Keep messaging informative and helpful. Never patronize or overcomplicate.

## Core Messaging

For detailed terminology, messaging frameworks, and approved copy, read
`references/messaging.md`.

## Product Content

For detailed product descriptions, security module definitions, key threats addressed,
and platform characteristics, read `references/product-content.md`. Use this when
writing feature copy, describing security modules, or building product-related UI.

## Visual Elements

For guidance on photography, illustrations, icons, graphic elements, screenshots,
and effects, read `references/visual-elements.md`.
