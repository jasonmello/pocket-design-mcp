// Design tokens computed locally: type scale, spacing, shadows, and export to CSS / Tailwind v4 / DTCG.
import { parseHex, shades } from "./color.js";

const round = (n: number, d = 3) => +n.toFixed(d);
const rem = (px: number) => `${round(px / 16, 4)}rem`;

// ---------- Type scale ----------

export const RATIOS: Record<string, number> = {
  "minor-second": 1.067,
  "major-second": 1.125,
  "minor-third": 1.2,
  "major-third": 1.25,
  "perfect-fourth": 1.333,
  "augmented-fourth": 1.414,
  "perfect-fifth": 1.5,
  "golden-ratio": 1.618,
};

const STEP_NAMES: Record<number, string> = {
  [-2]: "xs", [-1]: "sm", 0: "base", 1: "lg", 2: "xl", 3: "2xl", 4: "3xl", 5: "4xl", 6: "5xl", 7: "6xl", 8: "7xl",
};

export interface TypeScaleOptions {
  minBase: number; // px at the smallest viewport
  maxBase: number; // px at the largest viewport
  minRatio: number;
  maxRatio: number;
  stepsUp: number;
  stepsDown: number;
  minViewport: number;
  maxViewport: number;
}

export interface TypeStep {
  name: string;
  step: number;
  minPx: number;
  maxPx: number;
  clamp: string;
  lineHeight: number;
  letterSpacing: string;
}

/** Fluid modular type scale (the Utopia approach): each step grows smoothly between two viewports. */
export function typeScale(o: TypeScaleOptions): TypeStep[] {
  if (o.maxViewport <= o.minViewport) throw new Error("maxViewport must be larger than minViewport");
  const steps: TypeStep[] = [];
  for (let s = -o.stepsDown; s <= o.stepsUp; s++) {
    const min = o.minBase * o.minRatio ** s;
    const max = o.maxBase * o.maxRatio ** s;
    const slope = (max - min) / (o.maxViewport - o.minViewport);
    const intercept = min - slope * o.minViewport;
    const [lo, hi] = [Math.min(min, max), Math.max(min, max)];
    const preferred = `${rem(intercept)} + ${round(slope * 100, 4)}vw`;
    // Bigger text needs tighter leading and tracking.
    const lineHeight = max <= 20 ? 1.5 : max <= 32 ? 1.3 : max <= 48 ? 1.15 : 1.05;
    const letterSpacing = max <= 20 ? "0em" : max <= 32 ? "-0.01em" : "-0.02em";
    steps.push({
      name: STEP_NAMES[s] ?? `step-${s}`,
      step: s,
      minPx: round(min, 2),
      maxPx: round(max, 2),
      clamp: lo === hi ? rem(lo) : `clamp(${rem(lo)}, ${preferred}, ${rem(hi)})`,
      lineHeight,
      letterSpacing,
    });
  }
  return steps;
}

// ---------- Spacing ----------

export function spacingScale(base: number, kind: "linear" | "geometric", ratio: number) {
  // Linear follows Tailwind's multipliers; geometric multiplies by `ratio` each step.
  const multipliers = kind === "linear" ? [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32] : [0, ...Array.from({ length: 12 }, (_, i) => ratio ** i)];
  return multipliers.map((m, i) => {
    const px = round(base * m, 2);
    return { name: kind === "linear" ? String(m) : String(i), px, rem: rem(px) };
  });
}

// ---------- Shadows ----------

function rgba(hex: string, alpha: number) {
  const [r, g, b] = parseHex(hex).map((v) => Math.round(v * 255));
  return `rgb(${r} ${g} ${b} / ${round(alpha, 3)})`;
}

/**
 * Layered shadows: each elevation stacks several soft layers whose offset and blur double,
 * which looks closer to real light than one big blur.
 */
export function makeShadows(opts: { color: string; levels: number; intensity: number; style: "soft" | "crisp" }) {
  const out: { name: string; css: string }[] = [];
  for (let level = 1; level <= opts.levels; level++) {
    const layers: string[] = [];
    const alpha = (opts.style === "crisp" ? 0.14 : 0.08) * opts.intensity;
    for (let j = 0; j < level + 1; j++) {
      const y = 2 ** j * (opts.style === "crisp" ? 0.5 : 1);
      const blur = 2 ** j * (opts.style === "crisp" ? 1 : 2);
      layers.push(`0 ${round(y, 2)}px ${round(blur, 2)}px ${rgba(opts.color, alpha / Math.sqrt(level))}`);
    }
    out.push({ name: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"][level - 1] ?? `level-${level}`, css: layers.join(", ") });
  }
  return out;
}

// ---------- Export ----------

export interface TokenSet {
  colors: Record<string, string>;
  type: TypeStep[];
  spacingBase: number;
  shadows: { name: string; css: string }[];
  radius: Record<string, string>;
  fonts: Record<string, string>;
}

export const DEFAULT_RADIUS = { sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px" };

export function exportTokens(set: TokenSet, format: "css" | "tailwind" | "dtcg"): string {
  const palette = Object.entries(set.colors).map(([name, hex]) => [name, shades(hex)] as const);

  if (format === "dtcg") {
    const json = {
      color: Object.fromEntries(
        palette.map(([name, s]) => [name, Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { $type: "color", $value: v }]))]),
      ),
      fontFamily: Object.fromEntries(Object.entries(set.fonts).map(([k, v]) => [k, { $type: "fontFamily", $value: v }])),
      fontSize: Object.fromEntries(set.type.map((t) => [t.name, { $type: "dimension", $value: t.clamp }])),
      spacing: { base: { $type: "dimension", $value: rem(set.spacingBase) } },
      radius: Object.fromEntries(Object.entries(set.radius).map(([k, v]) => [k, { $type: "dimension", $value: v }])),
      shadow: Object.fromEntries(set.shadows.map((s) => [s.name, { $type: "shadow", $value: s.css }])),
    };
    return JSON.stringify(json, null, 2);
  }

  const lines: string[] = [];
  const tw = format === "tailwind";
  for (const [name, s] of palette) for (const [k, v] of Object.entries(s)) lines.push(`  --color-${name}-${k}: ${v};`);
  for (const [k, v] of Object.entries(set.fonts)) lines.push(`  --font-${k}: ${v};`);
  for (const t of set.type) {
    lines.push(`  --text-${t.name}: ${t.clamp};`);
    lines.push(`  --text-${t.name}--line-height: ${t.lineHeight};`);
    lines.push(`  --text-${t.name}--letter-spacing: ${t.letterSpacing};`);
  }
  // Tailwind v4 derives every spacing utility from one --spacing variable.
  lines.push(tw ? `  --spacing: ${rem(set.spacingBase)};` : `  --space-unit: ${rem(set.spacingBase)};`);
  for (const [k, v] of Object.entries(set.radius)) lines.push(`  --radius-${k}: ${v};`);
  for (const s of set.shadows) lines.push(`  --shadow-${s.name}: ${s.css};`);
  return tw ? `@import "tailwindcss";\n\n@theme {\n${lines.join("\n")}\n}` : `:root {\n${lines.join("\n")}\n}`;
}
