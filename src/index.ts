#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CATALOG } from "./catalog.js";
import { apca, contrast, fixContrast, harmony, shades, type Harmony } from "./color.js";
import { EASING_NAMES, easingGradient, getEasing, spring } from "./motion.js";
import {
  getComponent,
  getIcon,
  ICON_SETS,
  optimizeSvg,
  REGISTRIES,
  type RegistryId,
  searchComponents,
  searchFonts,
  searchIcons,
  searchImages,
  type IconSet,
} from "./sources.js";

const server = new McpServer({ name: "pocket-design", version: "0.2.0" });

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
      "Searches Phosphor, Hugeicons, Feather and Pixelarticons (via Iconify, free). Returns names as prefix:name; " +
      "use get_icon to get the SVG. Search in English (house, arrow, settings).",
    inputSchema: {
      query: z.string().min(1).describe("Search term in English"),
      sets: z.array(z.enum(Object.keys(ICON_SETS) as [IconSet, ...IconSet[]])).optional().describe("Default: all"),
      limit: z.number().int().min(1).max(100).default(24),
    },
    annotations: readOnly,
  },
  safe(({ query, sets, limit }) => searchIcons(query, sets ?? [], limit)),
);

server.registerTool(
  "get_icon",
  {
    title: "Get icon SVG",
    description: "Returns a ready-to-use icon SVG, e.g. ph:house, hugeicons:home-01, feather:home, pixelarticons:home.",
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
      "Searches free fonts on Google Fonts and Fontshare. Returns weights, whether it is variable, the CSS link to paste in <head>, and the font page. " +
      "Without a query, returns the most popular in the category.",
    inputSchema: {
      query: z.string().optional().describe("Name or part of it, e.g. inter, satoshi"),
      category: z.string().optional().describe("sans, serif, display, mono, handwriting or slab"),
      source: z.enum(["all", "google", "fontshare"]).default("all"),
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
    description: "Searches free photos, illustrations and vectors on Pixabay. Needs the PIXABAY_API_KEY variable (free key).",
    inputSchema: {
      query: z.string().min(1).describe("Search term (English gives more results)"),
      type: z.enum(["all", "photo", "illustration", "vector"]).default("photo"),
      orientation: z.enum(["all", "horizontal", "vertical"]).default("all"),
      limit: z.number().int().min(1).max(50).default(10),
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

await server.connect(new StdioServerTransport());
