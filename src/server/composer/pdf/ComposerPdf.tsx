import React from "react";
import {
  Circle,
  Defs,
  Document,
  Font,
  Image,
  LinearGradient,
  Link,
  Page,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  capitalizeWords,
  INLINE_MARKUP,
  LINK_MARKUP,
} from "@/server/composer/markup";
import type {
  Block,
  ComposerDocument,
  ComposerFooter,
} from "@/server/composer/schema";
import { ACCENT_TONES, COLORS } from "@/server/composer/tokens";

/**
 * react-pdf rendering of a composer document.
 *
 * The editor draws pages at 1224x1584 (US Letter at 144dpi) because that is the
 * Figma artboard size. PDF user space is 72dpi, so every design dimension is
 * halved on the way in - that is all `pt()` does, and it is the only unit
 * conversion in this file. Colours are shared with the editor via `tokens.ts`.
 *
 * This is a second renderer alongside `block-views.tsx`; the two must be kept in
 * step by hand. Anything added to `blockSchema` needs a branch in both.
 */

/** Design px (144dpi) -> PDF points (72dpi). */
const pt = (px: number) => px / 2;

const CONTENT_WIDTH = pt(1096);
const MARGIN = pt(64);
const FOOTER_HEIGHT = pt(78);

const IS_SERVER = typeof window === "undefined";
const FONTS_BASE = IS_SERVER ? `${process.cwd()}/public/fonts` : "/fonts";
const LOGO_SRC = IS_SERVER
  ? `${process.cwd()}/public/logo-light.png`
  : "/logo-light.png";

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${FONTS_BASE}/Inter-Regular.woff`, fontWeight: 400 },
      { src: `${FONTS_BASE}/Inter-Bold.woff`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "RedHatDisplay",
    fonts: [
      { src: `${FONTS_BASE}/RedHatDisplay-Bold.woff`, fontWeight: 700 },
      // The report headings are ExtraBold; without this they fall back to Bold.
      { src: `${FONTS_BASE}/RedHatDisplay-ExtraBold.ttf`, fontWeight: 800 },
    ],
  });
  // Long unbroken tokens (URLs, long labels) should wrap rather than overflow.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

/** Point-space equivalents of the editor's TYPE scale. */
const T = {
  headline: {
    fontFamily: "RedHatDisplay",
    fontWeight: 800 as const,
    fontSize: pt(32),
    lineHeight: 48 / 32,
    letterSpacing: pt(1),
  },
  subhead: {
    fontFamily: "RedHatDisplay",
    fontWeight: 800 as const,
    fontSize: pt(22),
    lineHeight: 38 / 22,
    letterSpacing: pt(1),
  },
  body: {
    fontFamily: "Inter",
    fontSize: pt(20),
    lineHeight: 36 / 20,
    letterSpacing: pt(0.5),
    color: COLORS.body,
  },
  small: {
    fontFamily: "Inter",
    fontSize: pt(16),
    lineHeight: 1.5,
    letterSpacing: pt(0.5),
    color: COLORS.body,
  },
} as const;

/**
 * `**bold**` spans and `[label](url)` links, matching the editor's inline markup.
 * The patterns come from block-views so the two renderers cannot drift on what
 * counts as markup.
 */
function RichText({
  text,
  linkColor = COLORS.purple,
}: {
  text: string;
  /** See block-views: a surface whose body text is already the link colour
   *  passes something else. */
  linkColor?: string;
}) {
  return (
    <>
      {text.split(INLINE_MARKUP).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ fontWeight: 700 }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        const link = LINK_MARKUP.exec(part);
        if (link) {
          return (
            <Link
              key={i}
              src={link[2]}
              // Matches the HTML view: colour only, no rule.
              style={{ color: linkColor, textDecoration: "none" }}
            >
              {link[1]}
            </Link>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </>
  );
}

/** A horizontal rule that fades out, as a gradient-filled 1pt rect. */
function FadingRule({ width = CONTENT_WIDTH }: { width?: number }) {
  return (
    <Svg width={width} height={1} viewBox={`0 0 ${width} 1`}>
      <Defs>
        <LinearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={COLORS.purpleLight} />
          <Stop offset="0.55" stopColor={COLORS.line} />
          <Stop offset="1" stopColor={COLORS.line} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={1} fill="url(#rule)" />
    </Svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={10} viewBox="0 0 22 20">
      <Path
        d="M11 1.5 20.5 18H1.5L11 1.5Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Path d="M11 7v5" stroke={color} strokeWidth={2} />
      <Circle cx={11} cy={15} r={1.15} fill={color} />
    </Svg>
  );
}

function CheckMark() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={12} fill={COLORS.indigo} />
      <Path
        d="M6.5 12.4 10.4 16.3 17.5 8.4"
        stroke="#FFFFFF"
        strokeWidth={2.4}
        fill="none"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ blocks */

function HeadingBlock({
  block,
}: {
  block: Extract<Block, { type: "heading" }>;
}) {
  const base = block.tone === "purple" ? COLORS.purple : COLORS.indigo;
  const accent = block.tone === "purple" ? COLORS.indigo : COLORS.purple;
  return (
    <Text
      style={{
        ...(block.size === "large" ? T.headline : T.subhead),
        color: base,
      }}
    >
      {block.text}
      {block.accentText ? (
        <Text style={{ color: accent }}> {block.accentText}</Text>
      ) : null}
    </Text>
  );
}

function NumberChip({ label, size = 16 }: { label: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        backgroundColor: COLORS.lavender,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: pt(16),
          color: COLORS.purple,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Stand-in for `CARD_SHADOW` (`0 0 32px rgba(101,79,232,0.15)`), which react-pdf
 * cannot express - there is no box-shadow and no blur filter.
 *
 * The halo is stacked by hand instead: `rings` translucent rounded rects
 * marching outward from the card edge, each adding a little alpha, so the result
 * is densest against the card and fades out at the extent. A CSS blur of 32
 * spreads roughly half its radius beyond the box, hence the 16px default.
 *
 * These are Views rather than an Svg on purpose: absolute insets track whatever
 * height Yoga gives the card, on every side, so the halo cannot end up thicker
 * on one axis the way a stretched viewBox would make it.
 */
function Glow({
  radius = 8,
  spread = pt(16),
  rings = 10,
}: {
  radius?: number;
  spread?: number;
  rings?: number;
}) {
  const step = spread / rings;
  return (
    <>
      {Array.from({ length: rings }, (_, i) => {
        const out = spread - i * step;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              top: -out,
              left: -out,
              right: -out,
              bottom: -out,
              borderRadius: radius + out,
              backgroundColor: "rgba(101, 79, 232, 0.02)",
            }}
          />
        );
      })}
    </>
  );
}

/**
 * A card plus its glow, in two Views: the outer one carries the card's place in
 * the layout, the inner one its surface. They have to be separate - the glow
 * paints between them, so putting the background on the outer View would tint
 * the card itself instead of haloing it.
 */
function GlowCard({
  radius = 8,
  layout,
  surface,
  children,
}: {
  radius?: number;
  layout?: object;
  surface?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={{ position: "relative", ...layout }}>
      <Glow radius={radius} />
      <View style={{ flexGrow: 1, borderRadius: radius, ...surface }}>
        {children}
      </View>
    </View>
  );
}

/**
 * `PAGE_BACKGROUND`: off-white with two soft purple ellipses bled into the
 * corners. The editor gets them from two CSS radial-gradients; here they are
 * RadialGradient fills. The CSS ellipses are wider than they are tall
 * (`120% 80%`, `70% 50%`); these are circles covering the same reach, which at
 * 10% alpha is not a difference you can see on paper.
 */
function PageBackground() {
  const fill = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as const;
  return (
    <View style={fill}>
      {/*
       * `radial-gradient(120% 80% at 100% 100%, …0.10 0%, …0 60%)`.
       *
       * RadialGradient is circular, so the ellipse comes from stretching a
       * non-square viewBox onto the page: a circle of radius r in a VW x VH box
       * scaled to W x H ends up with radii (r*W/VW, r*H/VH). Solving that for
       * 1.2W and 0.8H gives r=120 in a 100x150 box. Stop offsets are fractions
       * of r under userSpaceOnUse, which is what the CSS percentages are too.
       */}
      <View style={fill}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient
              id="pageBottomRight"
              cx="100"
              cy="150"
              r="120"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={COLORS.purple} stopOpacity={0.1} />
              <Stop offset="0.6" stopColor={COLORS.purple} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={100}
            height={150}
            fill="url(#pageBottomRight)"
          />
        </Svg>
      </View>
      {/* `radial-gradient(70% 50% at 0% 0%, …0.10 0%, …0 70%)` - r=70 in 100x140. */}
      <View style={fill}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient
              id="pageTopLeft"
              cx="0"
              cy="0"
              r="70"
              gradientUnits="userSpaceOnUse"
            >
              <Stop
                offset="0"
                stopColor={COLORS.purpleLight}
                stopOpacity={0.1}
              />
              <Stop
                offset="0.7"
                stopColor={COLORS.purpleLight}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={100} height={140} fill="url(#pageTopLeft)" />
        </Svg>
      </View>
    </View>
  );
}

function StatCards({
  block,
}: {
  block: Extract<Block, { type: "statCards" }>;
}) {
  const gap = pt(16);
  const width =
    (CONTENT_WIDTH - gap * (block.cards.length - 1)) / block.cards.length;
  return (
    <View style={{ flexDirection: "row" }}>
      {block.cards.map((card, i) => {
        const tone = ACCENT_TONES[card.tone] ?? ACCENT_TONES.amber;
        return (
          <GlowCard
            key={i}
            layout={{
              width,
              height: pt(192),
              marginRight: i === block.cards.length - 1 ? 0 : gap,
            }}
            surface={{
              backgroundColor: COLORS.white,
              paddingHorizontal: pt(24),
              paddingTop: pt(24),
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: pt(60),
                height: pt(48),
                backgroundColor: tone.badge,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <WarningIcon color={tone.icon} />
            </View>
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: 700,
                fontSize: pt(78),
                letterSpacing: pt(0.7),
                color: COLORS.indigo,
              }}
            >
              {card.value}
            </Text>
            <Text
              style={{ ...T.small, marginTop: pt(4), paddingRight: pt(40) }}
            >
              {card.label}
            </Text>
          </GlowCard>
        );
      })}
    </View>
  );
}

function ChartCard({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <GlowCard
      layout={{ minHeight: height }}
      surface={{
        backgroundColor: COLORS.white,
        paddingHorizontal: pt(24),
        paddingTop: pt(24),
        paddingBottom: pt(16),
      }}
    >
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: pt(20),
          letterSpacing: pt(0.5),
          color: COLORS.indigo,
          textAlign: "center",
          marginBottom: pt(24),
        }}
      >
        {title}
      </Text>
      {children}
    </GlowCard>
  );
}

function ColumnChart({
  block,
}: {
  block: Extract<Block, { type: "columnChart" }>;
}) {
  const plotHeight = pt(250);
  const axisWidth = pt(48);
  const ticks = Array.from(
    { length: Math.floor(block.max / 10) + 1 },
    (_, i) => i * 10,
  );
  const y = (v: number) =>
    (1 - Math.min(v, block.max) / block.max) * plotHeight;
  const plotWidth = CONTENT_WIDTH - pt(48) - axisWidth;
  const slot = plotWidth / block.series.length;

  return (
    <ChartCard title={block.title} height={pt(421)}>
      <View style={{ flexDirection: "row" }}>
        <View
          style={{ width: axisWidth, height: plotHeight, position: "relative" }}
        >
          {ticks.map((t) => (
            <Text
              key={t}
              style={{
                ...T.small,
                position: "absolute",
                right: pt(8),
                // nudge up by half a line so the label centres on its gridline
                top: y(t) - pt(16) * 0.75,
              }}
            >
              {t}%
            </Text>
          ))}
        </View>

        <View style={{ width: plotWidth }}>
          <View style={{ height: plotHeight, position: "relative" }}>
            {ticks.map((t) => (
              <View
                key={t}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: y(t),
                  height: 0.5,
                  backgroundColor: COLORS.line,
                }}
              />
            ))}
            {/* Bars and pills must be DIRECT children of the sized plot view -
                an absolute child resolves against its immediate parent, so a
                wrapper View here collapses to zero height and throws them out
                of the card entirely. */}
            {block.series.map((point, i) => {
              const barHeight = Math.max(1, plotHeight - y(point.value));
              return (
                <React.Fragment key={i}>
                  <View
                    style={{
                      position: "absolute",
                      left: i * slot + slot / 2 - pt(46) / 2,
                      bottom: 0,
                      width: pt(46),
                      height: barHeight,
                      backgroundColor: COLORS.indigo,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: i * slot,
                      width: slot,
                      bottom: barHeight + pt(8),
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.lavender,
                        borderRadius: 3,
                        paddingHorizontal: pt(8),
                        paddingVertical: pt(2),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontWeight: 700,
                          fontSize: pt(16),
                          color: COLORS.indigo,
                        }}
                      >
                        {point.value}%
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", paddingTop: pt(12) }}>
            {block.series.map((point, i) => (
              <View key={i} style={{ width: slot, paddingHorizontal: pt(4) }}>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: pt(15),
                    lineHeight: 1.35,
                    color: COLORS.purple,
                    textAlign: "center",
                  }}
                >
                  {point.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ChartCard>
  );
}

function BarChart({ block }: { block: Extract<Block, { type: "barChart" }> }) {
  const labelWidth = pt(420);
  const trackWidth = CONTENT_WIDTH - pt(48) - labelWidth - pt(90);
  return (
    <ChartCard title={block.title} height={pt(384)}>
      <View style={{ position: "relative" }}>
        <View
          style={{
            position: "absolute",
            left: labelWidth,
            top: 0,
            bottom: 0,
            width: 0.5,
            backgroundColor: COLORS.purpleLight,
          }}
        />
        {block.series.map((point, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: i === block.series.length - 1 ? 0 : pt(20),
            }}
          >
            <View style={{ width: labelWidth, paddingRight: pt(16) }}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: pt(16),
                  color: COLORS.purple,
                }}
              >
                {point.label}
              </Text>
            </View>
            <View
              style={{
                width:
                  (Math.min(point.value, block.max) / block.max) * trackWidth,
                height: pt(32),
                backgroundColor: COLORS.indigo,
                borderTopRightRadius: 2,
                borderBottomRightRadius: 2,
              }}
            />
            <View
              style={{
                marginLeft: pt(12),
                backgroundColor: COLORS.lavender,
                borderRadius: 3,
                paddingHorizontal: pt(8),
                paddingVertical: pt(2),
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: pt(16),
                  color: COLORS.indigo,
                }}
              >
                {point.value}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ChartCard>
  );
}

function Callout({ block }: { block: Extract<Block, { type: "callout" }> }) {
  const height = pt(218);
  return (
    <View style={{ position: "relative", minHeight: height, borderRadius: 8 }}>
      <Glow radius={8} />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${CONTENT_WIDTH} ${height}`}
          preserveAspectRatio="none"
        >
          <Defs>
            {/*
             * CALLOUT_GRADIENT is
             * `linear-gradient(-5.22deg, #1B153E 25.885%, #1B153E 42.124%, #654FE8 131.1%)`.
             * -5.22deg is within a few degrees of "to top", so the axis runs
             * bottom-to-top, not corner-to-corner. Two details this has to keep:
             * the dark hold over the first 42% of the line, and the purple stop
             * sitting at 131% - off the top edge, so the top of the card lands
             * ~65% of the way to #654FE8 (#4B3BAD) and never reaches it. The
             * 5.22deg tilt itself is dropped.
             *
             * gradientUnits="userSpaceOnUse" is required, not optional: with the
             * SVG default react-pdf ignores fractional x1/y1/x2/y2 and paints
             * every gradient left-to-right, so asking for a vertical axis with
             * y1="1" x2="0" comes out indistinguishable from a horizontal one.
             * Same trap as PageBackground's radials.
             */}
            <LinearGradient
              id="callout"
              x1="0"
              y1={height}
              x2="0"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={COLORS.ink} />
              <Stop offset="0.42124" stopColor={COLORS.ink} />
              <Stop offset="1" stopColor="#4B3BAD" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={CONTENT_WIDTH}
            height={height}
            rx={8}
            fill="url(#callout)"
          />
        </Svg>
      </View>
      <View style={{ padding: pt(24) }}>
        <Text style={{ ...T.subhead, color: COLORS.white }}>
          {capitalizeWords(block.title)}
        </Text>
        <Text
          style={{
            ...T.body,
            color: COLORS.white,
            marginTop: pt(4),
            maxWidth: pt(872),
          }}
        >
          <RichText text={block.body} linkColor={COLORS.purpleLight} />
        </Text>
      </View>
    </View>
  );
}

function Quote({ block }: { block: Extract<Block, { type: "quote" }> }) {
  // Kept in normal flow rather than absolutely positioned: a 60pt glyph's line
  // box is tall enough that an absolute mark lands on top of the first line of
  // the quote, and its exact offset depends on font metrics.
  const mark = {
    fontFamily: "RedHatDisplay",
    fontWeight: 800 as const,
    fontSize: pt(96),
    lineHeight: 0.9,
    color: COLORS.purple,
  };
  return (
    <GlowCard
      surface={{
        backgroundColor: COLORS.white,
        paddingHorizontal: pt(32),
        paddingTop: pt(20),
        paddingBottom: pt(24),
      }}
    >
      <Text style={mark}>&ldquo;</Text>
      <Text style={{ ...T.body, marginTop: pt(8) }}>
        <RichText text={block.quote} />
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: pt(24),
        }}
      >
        <View>
          <Text
            style={{
              ...T.small,
              fontSize: pt(20),
              fontWeight: 700,
              color: COLORS.purple,
            }}
          >
            {block.name}
          </Text>
          <Text
            style={{ ...T.small, fontSize: pt(18), color: COLORS.purpleLight }}
          >
            {block.role}
          </Text>
        </View>
        <Text style={mark}>&rdquo;</Text>
      </View>
    </GlowCard>
  );
}

function AuthorBio({
  block,
}: {
  block: Extract<Block, { type: "authorBio" }>;
}) {
  return (
    <GlowCard
      layout={{ minHeight: pt(218) }}
      surface={{
        flexDirection: "row",
        backgroundColor: COLORS.white,
        overflow: "hidden",
      }}
    >
      {block.photoUrl ? (
        <Image
          src={block.photoUrl}
          style={{ width: pt(328), objectFit: "cover" }}
        />
      ) : (
        <View
          style={{
            width: pt(328),
            backgroundColor: COLORS.lavender,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ ...T.small, color: COLORS.purpleLight }}>
            Portrait
          </Text>
        </View>
      )}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: pt(32),
          paddingVertical: pt(24),
        }}
      >
        <Text style={{ ...T.subhead, color: COLORS.purple }}>{block.name}</Text>
        <Text
          style={{
            ...T.small,
            fontSize: pt(18),
            color: COLORS.purple,
            marginBottom: pt(12),
          }}
        >
          {block.role}
        </Text>
        <Text style={{ ...T.body, fontSize: pt(18), lineHeight: 30 / 18 }}>
          {block.bio}
        </Text>
      </View>
    </GlowCard>
  );
}

function FeatureGrid({
  block,
}: {
  block: Extract<Block, { type: "featureGrid" }>;
}) {
  const gap = pt(24);
  const width = (CONTENT_WIDTH - gap) / 2;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {block.features.map((feature, i) => (
        <View
          key={i}
          style={{
            width,
            minHeight: pt(170),
            marginRight: i % 2 === 0 ? gap : 0,
            marginBottom: gap,
            backgroundColor: COLORS.lavender50,
            borderRadius: 6,
            paddingHorizontal: pt(24),
            paddingVertical: pt(20),
          }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: pt(20),
              color: COLORS.body,
              marginBottom: pt(8),
            }}
          >
            {feature.title}
          </Text>
          <Text style={{ ...T.small, fontSize: pt(18), lineHeight: 1.6 }}>
            {feature.body}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ComparisonMatrix({
  block,
}: {
  block: Extract<Block, { type: "comparisonMatrix" }>;
}) {
  const labelWidth = pt(320);
  const cellWidth = (CONTENT_WIDTH - pt(48) - labelWidth) / block.tiers.length;
  return (
    <GlowCard
      surface={{
        backgroundColor: COLORS.white,
        paddingHorizontal: pt(24),
        paddingVertical: pt(16),
      }}
    >
      {block.title ? (
        <Text
          style={{
            ...T.subhead,
            fontSize: pt(22),
            lineHeight: 1.35,
            color: COLORS.indigo,
            marginBottom: pt(10),
          }}
        >
          {block.title}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <View style={{ width: labelWidth }} />
        {block.tiers.map((tier, i) => (
          <View key={i} style={{ width: cellWidth, paddingBottom: pt(8) }}>
            <Text
              style={{
                ...T.subhead,
                fontSize: pt(20),
                lineHeight: 1.4,
                color: COLORS.indigo,
                textAlign: "center",
              }}
            >
              {tier}
            </Text>
          </View>
        ))}
      </View>
      {block.rows.map((row, r) => (
        <View
          key={r}
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 4,
            paddingVertical: pt(8),
            marginBottom: pt(4),
            backgroundColor: r % 2 === 0 ? "#F6F5FB" : COLORS.white,
          }}
        >
          <View style={{ width: labelWidth, paddingHorizontal: pt(12) }}>
            <Text style={{ ...T.small, fontSize: pt(16) }}>{row.label}</Text>
          </View>
          {block.tiers.map((_, c) => {
            const cell = row.checks[c];
            return (
              <View
                key={c}
                style={{
                  width: cellWidth,
                  minHeight: pt(24),
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: pt(4),
                  borderLeftWidth: 0.5,
                  borderLeftColor: COLORS.purpleLight,
                  borderLeftStyle: "dashed",
                }}
              >
                {typeof cell === "string" ? (
                  <Text
                    style={{
                      ...T.small,
                      fontSize: pt(16),
                      fontWeight: 700,
                      color: COLORS.indigo,
                      textAlign: "center",
                    }}
                  >
                    {cell}
                  </Text>
                ) : cell ? (
                  <CheckMark />
                ) : (
                  <View style={{ height: 12 }} />
                )}
              </View>
            );
          })}
        </View>
      ))}
      {block.note ? (
        <Text
          style={{
            ...T.small,
            fontSize: pt(15),
            color: COLORS.muted,
            marginTop: pt(5),
          }}
        >
          <RichText text={block.note} />
        </Text>
      ) : null}
    </GlowCard>
  );
}

function BattlecardList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            marginBottom: i === items.length - 1 ? 0 : pt(8),
          }}
        >
          <Text
            style={{
              ...T.small,
              fontSize: pt(14),
              color: COLORS.purple,
              marginRight: pt(7),
            }}
          >
            &bull;
          </Text>
          <Text
            style={{
              ...T.small,
              fontSize: pt(15),
              lineHeight: 1.5,
              flex: 1,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BattlecardSection({
  title,
  items,
  width,
}: {
  title: string;
  items: string[];
  width: number;
}) {
  return (
    <View
      style={{
        width,
        backgroundColor: COLORS.lavender,
        borderRadius: pt(10),
        padding: pt(18),
      }}
    >
      <Text
        style={{
          ...T.small,
          fontSize: pt(18),
          fontWeight: 700,
          color: COLORS.indigo,
          marginBottom: pt(10),
        }}
      >
        {title}
      </Text>
      <BattlecardList items={items} />
    </View>
  );
}

function Battlecard({
  block,
}: {
  block: Extract<Block, { type: "battlecard" }>;
}) {
  const innerWidth = CONTENT_WIDTH - pt(56);
  const columnGap = pt(20);
  const columnWidth = (innerWidth - columnGap) / 2;

  return (
    <View wrap={false}>
      <GlowCard
        surface={{
          backgroundColor: COLORS.white,
          padding: pt(28),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: pt(18),
          }}
        >
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: pt(10),
              }}
            >
              <View
                style={{
                  backgroundColor: "#FDE8ED",
                  borderRadius: pt(10),
                  paddingHorizontal: pt(10),
                  paddingVertical: pt(4),
                  marginRight: pt(10),
                }}
              >
                <Text
                  style={{
                    ...T.small,
                    fontSize: pt(12),
                    fontWeight: 700,
                    color: "#B51E44",
                    letterSpacing: pt(0.8),
                  }}
                >
                  INTERNAL USE ONLY
                </Text>
              </View>
              <Text
                style={{ ...T.small, fontSize: pt(13), color: COLORS.muted }}
              >
                Updated {block.updatedAt}
              </Text>
            </View>
            <Text style={{ ...T.headline, color: COLORS.indigo }}>
              Guardz vs. {block.competitor}
            </Text>
          </View>
          {block.sourceUrl ? (
            <Link
              src={block.sourceUrl}
              style={{
                ...T.small,
                fontSize: pt(13),
                color: COLORS.purple,
                textDecoration: "none",
                borderWidth: 0.5,
                borderColor: COLORS.purpleLight,
                borderRadius: pt(6),
                paddingHorizontal: pt(10),
                paddingVertical: pt(7),
              }}
            >
              Open source
            </Link>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: "#F7F6FC",
            borderLeftWidth: pt(4),
            borderLeftColor: COLORS.purple,
            borderRadius: pt(8),
            paddingHorizontal: pt(18),
            paddingVertical: pt(14),
            marginBottom: pt(18),
          }}
        >
          <Text style={{ ...T.body, fontSize: pt(17), lineHeight: 1.5 }}>
            {block.oneLine}
          </Text>
        </View>

        <View style={{ flexDirection: "row", marginBottom: pt(18) }}>
          <View style={{ marginRight: columnGap }}>
            <BattlecardSection
              title="Where they win"
              items={block.whereTheyWin}
              width={columnWidth}
            />
          </View>
          <BattlecardSection
            title="Where they lose"
            items={block.whereTheyLose}
            width={columnWidth}
          />
        </View>

        <View
          style={{
            borderWidth: 0.5,
            borderColor: "#E6E3F7",
            borderRadius: pt(10),
            padding: pt(18),
            marginBottom: pt(18),
          }}
        >
          <Text
            style={{
              ...T.small,
              fontSize: pt(18),
              fontWeight: 700,
              color: COLORS.indigo,
              marginBottom: pt(10),
            }}
          >
            Common objections
          </Text>
          <View style={{ flexDirection: "row" }}>
            {block.objections.map((item, i) => (
              <View
                key={i}
                style={{
                  width:
                    (innerWidth -
                      pt(36) -
                      pt(14) * (block.objections.length - 1)) /
                    block.objections.length,
                  backgroundColor: "#FAF9FD",
                  borderRadius: pt(7),
                  padding: pt(12),
                  marginRight: i === block.objections.length - 1 ? 0 : pt(14),
                }}
              >
                <Text
                  style={{
                    ...T.small,
                    fontSize: pt(14),
                    fontWeight: 700,
                    color: COLORS.indigo,
                    marginBottom: pt(5),
                  }}
                >
                  &ldquo;{item.objection}&rdquo;
                </Text>
                <Text
                  style={{ ...T.small, fontSize: pt(14), lineHeight: 1.45 }}
                >
                  {item.response}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row" }}>
          <View style={{ marginRight: columnGap }}>
            <BattlecardSection
              title="Win conditions"
              items={block.winConditions}
              width={columnWidth}
            />
          </View>
          <BattlecardSection
            title="Where to push in the deal"
            items={block.dealMoves}
            width={columnWidth}
          />
        </View>

        <Text
          style={{
            ...T.small,
            fontSize: pt(11),
            color: COLORS.muted,
            marginTop: pt(12),
          }}
        >
          Source: {block.sourceLabel}. Verify source freshness before sharing
          any competitive claim externally.
        </Text>
      </GlowCard>
    </View>
  );
}

/**
 * Wraps a button in a Link only when it has a URL. react-pdf's Link is an inline
 * element, so the button View goes inside it rather than the other way round.
 */
function MaybeLink({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  if (!url) return <>{children}</>;
  return <Link src={url}>{children}</Link>;
}

function Cta({ block }: { block: Extract<Block, { type: "cta" }> }) {
  const w = pt(238);
  const h = pt(56);
  return (
    <View>
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: 700,
          fontSize: pt(20),
          color: COLORS.indigo,
          marginBottom: pt(20),
        }}
      >
        {block.lead}
      </Text>
      <View style={{ flexDirection: "row" }}>
        {block.primaryLabel ? (
          <MaybeLink url={block.primaryUrl}>
            <View
              style={{
                minWidth: w,
                minHeight: h,
                borderRadius: 4,
                marginRight: pt(16),
                paddingHorizontal: pt(32),
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <Svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${w} ${h}`}
                  preserveAspectRatio="none"
                >
                  <Defs>
                    <LinearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={COLORS.indigo} />
                      <Stop offset="1" stopColor={COLORS.purple} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    x={0}
                    y={0}
                    width={w}
                    height={h}
                    rx={4}
                    fill="url(#cta)"
                  />
                </Svg>
              </View>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: pt(16),
                  color: COLORS.white,
                }}
              >
                {block.primaryLabel}
              </Text>
            </View>
          </MaybeLink>
        ) : null}
        {block.secondaryLabel ? (
          <MaybeLink url={block.secondaryUrl}>
            <View
              style={{
                minWidth: w,
                minHeight: h,
                borderRadius: 4,
                borderWidth: 0.75,
                borderColor: COLORS.purple,
                backgroundColor: COLORS.white,
                paddingHorizontal: pt(32),
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: 700,
                  fontSize: pt(16),
                  color: COLORS.indigo,
                }}
              >
                {block.secondaryLabel}
              </Text>
            </View>
          </MaybeLink>
        ) : null}
      </View>
    </View>
  );
}

function BlockPdf({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock block={block} />;
    case "numberedHeading":
      return (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <NumberChip label={block.number} />
          <Text
            style={{ ...T.subhead, color: COLORS.indigo, marginLeft: pt(10) }}
          >
            {block.text}
          </Text>
        </View>
      );
    case "paragraph":
      return (
        <View>
          {block.text.split(/\n{2,}/).map((para, i) => (
            <Text
              key={i}
              style={{
                ...T.body,
                marginBottom: i === 0 ? 0 : 0,
                marginTop: i === 0 ? 0 : pt(16),
              }}
            >
              <RichText text={para} />
            </Text>
          ))}
        </View>
      );
    case "toc":
      return (
        <View>
          {block.entries.map((entry, i) => (
            <View key={i} style={{ marginBottom: pt(32) }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingBottom: pt(12),
                }}
              >
                <Text style={T.body}>{entry.label}</Text>
                <Text style={T.body}>{entry.page}</Text>
              </View>
              <FadingRule />
            </View>
          ))}
        </View>
      );
    case "numberedList":
      return (
        <View>
          {block.items.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                marginBottom: i === block.items.length - 1 ? 0 : pt(16),
              }}
            >
              <View style={{ marginTop: pt(6) }}>
                <NumberChip label={String(i + 1)} size={pt(28)} />
              </View>
              <Text style={{ ...T.body, marginLeft: pt(12), flex: 1 }}>
                <RichText text={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "bulletList":
      return (
        <View>
          {block.lead ? (
            <Text style={{ ...T.body, fontWeight: 700, marginBottom: pt(8) }}>
              {block.lead}
            </Text>
          ) : null}
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: pt(4) }}>
              <Text style={{ ...T.body, marginRight: pt(12) }}>&bull;</Text>
              <Text style={{ ...T.body, flex: 1 }}>
                <RichText text={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "statCards":
      return <StatCards block={block} />;
    case "columnChart":
      return <ColumnChart block={block} />;
    case "barChart":
      return <BarChart block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "quote":
      return <Quote block={block} />;
    case "authorBio":
      return <AuthorBio block={block} />;
    case "featureGrid":
      return <FeatureGrid block={block} />;
    case "comparisonMatrix":
      return <ComparisonMatrix block={block} />;
    case "battlecard":
      return <Battlecard block={block} />;
    case "cta":
      return <Cta block={block} />;
    case "divider":
      return <FadingRule />;
    case "spacer":
      return <View style={{ height: pt(block.height) }} />;
  }
}

/* ------------------------------------------------------------------- page */

function Footer({
  docTitle,
  footer,
  pageNumber,
}: {
  docTitle: string;
  footer: ComposerFooter;
  pageNumber: number;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: FOOTER_HEIGHT,
        backgroundColor: COLORS.ink,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: MARGIN,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {footer.showLogo ? (
          <Image
            src={LOGO_SRC}
            style={{ width: pt(139), objectFit: "contain" }}
          />
        ) : null}
        <Text
          style={{
            ...T.small,
            color: COLORS.white,
            marginLeft: footer.showLogo ? pt(18) : 0,
          }}
        >
          {docTitle}
        </Text>
      </View>
      {footer.showPageNumber ? (
        <Text style={{ ...T.small, color: COLORS.white, fontWeight: 700 }}>
          {pageNumber}
        </Text>
      ) : null}
    </View>
  );
}

export function ComposerPdf({ doc }: { doc: ComposerDocument }) {
  registerFonts();
  return (
    <Document title={doc.docTitle}>
      {doc.pages.map((page, i) => (
        <Page
          key={page.id}
          size="LETTER"
          style={{
            backgroundColor: COLORS.offWhite,
            fontFamily: "Inter",
            color: COLORS.body,
            paddingTop: MARGIN,
            paddingHorizontal: MARGIN,
            paddingBottom: FOOTER_HEIGHT + pt(24),
          }}
        >
          <PageBackground />
          {page.blocks.map((block, b) => (
            <View
              key={block.id}
              style={{
                marginBottom:
                  b === page.blocks.length - 1
                    ? 0
                    : pt(
                        page.blocks.some((candidate) =>
                          candidate.id.startsWith("approved-pricing"),
                        )
                          ? 18
                          : 24,
                      ),
              }}
            >
              <BlockPdf block={block} />
            </View>
          ))}
          <Footer
            docTitle={doc.docTitle}
            footer={doc.footer}
            pageNumber={i + 1}
          />
        </Page>
      ))}
    </Document>
  );
}
