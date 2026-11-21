#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CATALOG } from "./catalog.js";
import { apca, contrast, fixContrast, harmony, shades, type Harmony } from "./color.js";
import { EASING_NAMES, easingGradient, getEasing, spring } from "./motion.js";
import { prompts } from "./prompts.js";
import { makeBlob, makePattern, PATTERNS } from "./patterns.js";
import { optimizeSvg, svgToReact } from "./svg.js";
import { DEFAULT_RADIUS, exportTokens, makeShadows, RATIOS, spacingScale, typeScale } from "./tokens.js";
import {
  DEFAULT_ICON_SETS,
  getComponent,
  getIcon,
  ICON_ALIASES,
  listIconSets,
  REGISTRIES,
  type RegistryId,
  searchComponents,
  searchFonts,
  searchIcons,
  searchImages,
} from "./sources.js";

const server = new McpServer({ name: "pocket-design", version: "0.3.0" });

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

// Errors come back as readable text instead of failing the call.
const safe =
  <A,>(fn: (args: A) => Promise<unknown> | unknown) =>
  async (args: A) => {
    try {
      return text(await fn(args));
    } catch (e) {
      return { ...text(`Error: ${(e as Error).message}`), isError: true };
    }
  };

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

server.registerTool(
  "list_resources",
  {
    title: "Resource catalog",
    description:
      "Lists the design resources in the catalog (references, images, components, icons, fonts, motion, 3D, audio...). " +
      "The `access` field says whether a tool in this MCP covers it (tool:...), whether it has an official MCP (mcp), or whether it is just a link. " +
      "Use it to suggest where to find inspiration or which tool to use.",
    inputSchema: {
      category: z.string().optional().describe("Filter by category, e.g. Icons, Fonts, Motion"),
      pricing: z.enum(["free", "freemium", "paid"]).optional(),
      query: z.string().optional().describe("Search by name"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ category, pricing, query }) => {
    const c = category?.toLowerCase();
    const q = query?.toLowerCase();
    const items = CATALOG.filter(
      (r) =>
        (!c || r.category.toLowerCase().includes(c)) &&
        (!pricing || r.pricing === pricing) &&
        (!q || r.name.toLowerCase().includes(q)),
    );
    return { categories: [...new Set(CATALOG.map((r) => r.category))], count: items.length, items };
  }),
);

server.registerTool(
  "search_icons",
  {
    title: "Search icons",
    description:
      "Searches any of Iconify's ~280 free icon sets. Returns names as prefix:name; use get_icon to get the SVG. " +
      `Aliases: ${Object.keys(ICON_ALIASES).join(", ")} (brands = brand logos, emoji, flags). ` +
      `Default sets: ${DEFAULT_ICON_SETS.join(", ")}. Search in English (house, arrow, settings).`,
    inputSchema: {
      query: z.string().min(1).describe("Search term in English"),
      sets: z.array(z.string()).optional().describe("Aliases or Iconify prefixes, e.g. [\"lucide\"], [\"brands\"], [\"material-symbols\"]"),
      limit: z.number().int().min(1).max(100).default(24),
    },
    annotations: readOnly,
  },
  safe(({ query, sets, limit }) => searchIcons(query, sets ?? [], limit)),
);

server.registerTool(
  "list_icon_sets",
  {
    title: "List icon sets",
    description: "Lists Iconify icon sets with prefix, icon count, license, category and sample names. Use it to pick a set for search_icons.",
    inputSchema: {
      query: z.string().optional().describe("Filter by name or prefix, e.g. material, logo, emoji"),
      category: z.string().optional().describe("E.g. UI 24px, Logos, Emoji, Flags / Maps"),
      limit: z.number().int().min(1).max(300).default(40),
    },
    annotations: readOnly,
  },
  safe(({ query, category, limit }) => listIconSets(query, category, limit)),
);

server.registerTool(
  "get_icon",
  {
    title: "Get icon SVG",
    description: "Returns a ready-to-use icon SVG, e.g. ph:house, lucide:house, simple-icons:figma, flag:br-4x3, fluent-emoji-flat:rocket.",
    inputSchema: {
      name: z.string().describe("prefix:name"),
      size: z.number().int().min(8).max(512).optional().describe("Height in px; default 1em"),
      color: z.string().optional().describe("Color, e.g. #111827 (default currentColor)"),
    },
    annotations: readOnly,
  },
  safe(({ name, size, color }) => getIcon(name, { size, color })),
);

server.registerTool(
  "search_fonts",
  {
    title: "Search fonts",
    description:
      "Searches free fonts on Google Fonts, Fontshare and Fontsource. Returns weights, whether it is variable, the CSS link to paste in <head>, " +
      "and `selfHost` (npm install + import) for self-hosting with Fontsource. Without a query, returns the most popular in the category.",
    inputSchema: {
      query: z.string().optional().describe("Name or part of it, e.g. inter, satoshi"),
      category: z.string().optional().describe("sans, serif, display, mono, handwriting or slab"),
      source: z.enum(["all", "google", "fontshare", "fontsource"]).default("all"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    annotations: readOnly,
  },
  safe((args) => searchFonts(args)),
);

server.registerTool(
  "search_images",
  {
    title: "Search images",
    description:
      "Searches free images with no key: Wikimedia Commons first, Openverse as fallback (both Creative Commons / free licenses). " +
      "Uses Pixabay instead when PIXABAY_API_KEY is set. Results include the license and the attribution text to show next to the image.",
    inputSchema: {
      query: z.string().min(1).describe("Search term (English gives more results)"),
      source: z.enum(["auto", "wikimedia", "openverse", "pixabay"]).default("auto").describe("auto = Pixabay if a key is set, otherwise Wikimedia Commons, then Openverse"),
      type: z.enum(["all", "photo", "illustration", "vector"]).default("photo"),
      orientation: z.enum(["all", "horizontal", "vertical"]).default("all"),
      commercial: z.boolean().default(true).describe("Openverse: only licenses that allow commercial use (Commons and Pixabay always do)"),
      limit: z.number().int().min(1).max(20).default(10),
    },
    annotations: readOnly,
  },
  safe((args) => searchImages(args)),
);

const registryIds = Object.keys(REGISTRIES) as [RegistryId, ...RegistryId[]];

server.registerTool(
  "search_components",
  {
    title: "Search components",
    description:
      "Searches four shadcn-format registries: shadcn (base UI), reactbits (animated text, backgrounds, cursors), " +
      "motion-primitives (animated components built with Motion) and fancy (effects and micro-interactions). Use get_component to see the code.",
    inputSchema: {
      query: z.string().optional().describe("E.g. dialog, text, cursor, marquee"),
      registries: z.array(z.enum(registryIds)).optional().describe("Default: all"),
      type: z.enum(["ui", "component", "block", "hook", "lib", "example"]).optional(),
      limit: z.number().int().min(1).max(100).default(30),
    },
    annotations: readOnly,
  },
  safe(({ query, registries, type, limit }) => searchComponents({ query, registries: registries ?? [], type, limit })),
);

server.registerTool(
  "get_component",
  {
    title: "Component code",
    description:
      "Returns a component's code, dependencies and install command. " +
      "In a project that already uses shadcn, prefer running the `install` command.",
    inputSchema: {
      name: z.string().describe("Name as returned by search_components, e.g. button, BlurText-TS-TW, text-effect"),
      registry: z.enum(registryIds).default("shadcn"),
    },
    annotations: readOnly,
  },
  safe(({ name, registry }) => getComponent(name, registry)),
);

server.registerTool(
  "get_easing",
  {
    title: "Ready-made easing",
    description:
      "Returns an easings.net curve as CSS (cubic-bezier or linear()), values for Motion, and the matching GSAP name. " +
      "With `spring`, computes a spring (stiffness, damping, mass) and returns linear() plus its duration.",
    inputSchema: {
      name: z.enum(EASING_NAMES as [string, ...string[]]).optional().describe("E.g. easeOutCubic, easeInOutBack, easeOutBounce"),
      spring: z
        .object({
          stiffness: z.number().positive().default(100),
          damping: z.number().positive().default(10),
          mass: z.number().positive().default(1),
        })
        .optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ name, spring: s }) => {
    if (s) return { spring: s, ...spring(s) };
    if (!name) throw new Error(`Pass name or spring. Names: ${EASING_NAMES.join(", ")}`);
    return getEasing(name);
  }),
);

server.registerTool(
  "easing_gradient",
  {
    title: "Eased gradient",
    description:
      "Generates a CSS linear-gradient with stops spaced along an easing curve, without the hard edge of linear gradients. " +
      "Good for scrims over images and transitions between sections.",
    inputSchema: {
      from: z.string().describe("Start color, e.g. #000 or rgb(0 0 0 / .8)"),
      to: z.string().default("transparent"),
      easing: z.enum(EASING_NAMES as [string, ...string[]]).default("easeInOutSine"),
      direction: z.string().default("to bottom").describe("E.g. to bottom, 45deg"),
      steps: z.number().int().min(2).max(30).default(12),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe((args) => easingGradient(args)),
);

server.registerTool(
  "check_contrast",
  {
    title: "Check contrast",
    description:
      "Measures text/background contrast with WCAG 2 (ratio) and APCA (Lc). If it fails the requested level, suggests the closest text color that passes.",
    inputSchema: {
      text: z.string().describe("Text color in hex"),
      background: z.string().describe("Background color in hex"),
      level: z.enum(["AA", "AA-large", "AAA", "AAA-large"]).default("AA"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ text: fg, background, level }) => {
    const target = { AA: 4.5, "AA-large": 3, AAA: 7, "AAA-large": 4.5 }[level];
    const ratio = +contrast(fg, background).toFixed(2);
    const passes = ratio >= target;
    return {
      wcag: { ratio, level, target, passes },
      apca: { lc: apca(fg, background), guide: "Lc 75+ body text, 60+ medium text, 45+ headings, 30+ icons and borders" },
      ...(passes ? {} : { suggestion: fixContrast(fg, background, target) }),
    };
  }),
);

server.registerTool(
  "optimize_svg",
  {
    title: "Optimize SVG",
    description: "Optimizes an SVG locally with svgo (the engine behind SVGOMG). Returns the SVG and its size before and after.",
    inputSchema: {
      svg: z.string().min(1).describe("Full SVG code"),
      precision: z.number().int().min(0).max(8).default(3).describe("Decimal places in coordinates"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ svg, precision }) => optimizeSvg(svg, precision)),
);

server.registerTool(
  "make_palette",
  {
    title: "Generate palette",
    description:
      "From a base color, generates the 50–950 scale (Tailwind-style, computed in OKLCH) and harmony colors, " +
      "with each step's WCAG contrast against white and black. Runs locally.",
    inputSchema: {
      base: z.string().describe("Base color in hex, e.g. #3b82f6"),
      harmony: z
        .enum(["complementary", "analogous", "triadic", "split-complementary", "tetradic"])
        .default("complementary"),
      name: z.string().default("primary").describe("Color name in the CSS variables"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ base, harmony: kind, name }) => {
    const scale = shades(base);
    const harmonies = harmony(base, kind as Harmony);
    return {
      scale: Object.fromEntries(
        Object.entries(scale).map(([k, hex]) => [
          k,
          { hex, onWhite: +contrast(hex, "#ffffff").toFixed(2), onBlack: +contrast(hex, "#000000").toFixed(2) },
        ]),
      ),
      harmony: { kind, colors: harmonies },
      css: `:root {\n${Object.entries(scale)
        .map(([k, hex]) => `  --${name}-${k}: ${hex};`)
        .join("\n")}\n}`,
      note: "WCAG AA minimum: 4.5 for normal text, 3 for large text.",
    };
  }),
);

// ---------- Design tokens ----------

server.registerTool(
  "type_scale",
  {
    title: "Fluid type scale",
    description:
      "Builds a modular type scale that grows smoothly between two viewports, as CSS clamp() values, with line-height and letter-spacing per step. " +
      `Named ratios: ${Object.keys(RATIOS).join(", ")}.`,
    inputSchema: {
      minBase: z.number().min(8).max(40).default(16).describe("Body size in px on small screens"),
      maxBase: z.number().min(8).max(48).default(18).describe("Body size in px on large screens"),
      minRatio: z.union([z.number().min(1).max(2), z.enum(Object.keys(RATIOS) as [string, ...string[]])]).default("minor-third"),
      maxRatio: z.union([z.number().min(1).max(2), z.enum(Object.keys(RATIOS) as [string, ...string[]])]).default("major-third"),
      stepsUp: z.number().int().min(0).max(8).default(5),
      stepsDown: z.number().int().min(0).max(2).default(2),
      minViewport: z.number().min(240).max(1200).default(360),
      maxViewport: z.number().min(600).max(2560).default(1280),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe((a) => {
    const ratio = (r: number | string) => (typeof r === "number" ? r : RATIOS[r]);
    const steps = typeScale({ ...a, minRatio: ratio(a.minRatio), maxRatio: ratio(a.maxRatio) });
    return {
      steps,
      css: `:root {\n${steps.map((s) => `  --text-${s.name}: ${s.clamp};`).join("\n")}\n}`,
    };
  }),
);

server.registerTool(
  "spacing_scale",
  {
    title: "Spacing scale",
    description: "Builds a spacing scale in px and rem: linear (Tailwind multipliers of a base unit) or geometric (each step multiplied by a ratio).",
    inputSchema: {
      base: z.number().min(1).max(32).default(4).describe("Base unit in px"),
      kind: z.enum(["linear", "geometric"]).default("linear"),
      ratio: z.number().min(1.1).max(3).default(1.5).describe("Geometric only"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ base, kind, ratio }) => spacingScale(base, kind, ratio)),
);

server.registerTool(
  "make_shadows",
  {
    title: "Layered shadows",
    description:
      "Generates elevation shadows (xs to 2xl) built from several stacked layers, which look closer to real light than a single blur. " +
      "Tint them with the background hue for a more natural result.",
    inputSchema: {
      color: z.string().default("#0f172a").describe("Shadow color in hex"),
      levels: z.number().int().min(1).max(7).default(5),
      intensity: z.number().min(0.2).max(3).default(1),
      style: z.enum(["soft", "crisp"]).default("soft"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe((args) => {
    const list = makeShadows(args);
    return { shadows: list, css: `:root {\n${list.map((s) => `  --shadow-${s.name}: ${s.css};`).join("\n")}\n}` };
  }),
);

server.registerTool(
  "export_tokens",
  {
    title: "Export design tokens",
    description:
      "Turns brand colors (plus a type scale, spacing, radius and shadows) into ready-to-paste tokens: " +
      "CSS variables, a Tailwind v4 @theme block, or W3C Design Tokens (DTCG) JSON. Each color becomes a 50–950 scale.",
    inputSchema: {
      colors: z.record(z.string(), z.string()).describe('Color name → hex, e.g. {"primary": "#3b82f6", "neutral": "#64748b"}'),
      format: z.enum(["css", "tailwind", "dtcg"]).default("tailwind"),
      fonts: z.record(z.string(), z.string()).optional().describe('E.g. {"sans": "\\"Inter Variable\\", sans-serif"}'),
      spacingBase: z.number().min(1).max(32).default(4),
      shadowColor: z.string().default("#0f172a"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ colors, format, fonts, spacingBase, shadowColor }) => {
    if (!Object.keys(colors).length) throw new Error("Pass at least one color.");
    for (const name of Object.keys(colors)) if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error(`Color name "${name}" must be lowercase kebab-case.`);
    return exportTokens(
      {
        colors,
        fonts: fonts ?? { sans: 'ui-sans-serif, system-ui, sans-serif', mono: "ui-monospace, monospace" },
        type: typeScale({ minBase: 16, maxBase: 18, minRatio: RATIOS["minor-third"], maxRatio: RATIOS["major-third"], stepsUp: 5, stepsDown: 2, minViewport: 360, maxViewport: 1280 }),
        spacingBase,
        radius: DEFAULT_RADIUS,
        shadows: makeShadows({ color: shadowColor, levels: 5, intensity: 1, style: "soft" }),
      },
      format,
    );
  }),
);

// ---------- SVG and backgrounds ----------

server.registerTool(
  "svg_to_react",
  {
    title: "SVG to React component",
    description:
      "Converts an SVG (e.g. from get_icon) into a React component: optimized with svgo, JSX attribute names, and props spread on the root " +
      "so size, color and aria-label can be set from outside.",
    inputSchema: {
      svg: z.string().min(1).describe("Full SVG code"),
      name: z.string().default("Icon").describe("PascalCase component name"),
      typescript: z.boolean().default(true),
      optimize: z.boolean().default(true),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ svg, name, typescript, optimize }) => svgToReact(svg, { name, typescript, optimize })),
);

server.registerTool(
  "make_pattern",
  {
    title: "Background pattern",
    description: `Generates a seamless SVG background pattern (${PATTERNS.join(", ")}) and the CSS to use it as background-image.`,
    inputSchema: {
      type: z.enum(PATTERNS),
      color: z.string().default("#94a3b8"),
      background: z.string().optional().describe("Optional fill behind the pattern"),
      size: z.number().min(4).max(200).default(24).describe("Tile size in px"),
      stroke: z.number().min(0.25).max(10).default(1).describe("Line width, or dot radius for dots"),
      opacity: z.number().min(0.02).max(1).default(0.4),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe((args) => makePattern(args)),
);

server.registerTool(
  "make_blob",
  {
    title: "Organic blob",
    description: "Generates a smooth organic blob shape as SVG. The same seed always returns the same shape; change it for variations.",
    inputSchema: {
      seed: z.number().int().default(1),
      points: z.number().int().min(3).max(16).default(6),
      randomness: z.number().min(0).max(1).default(0.5),
      size: z.number().min(50).max(1000).default(400),
      color: z.string().default("#6366f1"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe((args) => makeBlob(args)),
);

// ---------- Resources and prompts ----------

server.registerResource(
  "catalog",
  "pocket-design://catalog",
  { title: "Design resource catalog", description: "All curated design resources with category, pricing, URL and how to reach them.", mimeType: "application/json" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(CATALOG, null, 2) }] }),
);

for (const p of prompts) {
  server.registerPrompt(p.name, { title: p.title, description: p.description, argsSchema: p.args }, (args) => ({
    messages: [{ role: "user", content: { type: "text", text: p.build(args as Record<string, string | undefined>) } }],
  }));
}

await server.connect(new StdioServerTransport());
