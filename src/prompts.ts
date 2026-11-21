// Ready-made prompts that show up in the client's prompt menu. Each one chains this server's tools.
import { z } from "zod";

interface PromptDef {
  name: string;
  title: string;
  description: string;
  args: Record<string, z.ZodOptional<z.ZodString> | z.ZodString>;
  build: (a: Record<string, string | undefined>) => string;
}

export const prompts: PromptDef[] = [
  {
    name: "design_review",
    title: "Review a screen's design",
    description: "Reviews a UI file or screen for contrast, type scale, spacing rhythm, icon consistency and motion, then proposes concrete fixes.",
    args: {
      target: z.string().describe("File path, component name or a description of the screen"),
      focus: z.string().optional().describe("Optional focus, e.g. accessibility, mobile, dark mode"),
    },
    build: ({ target, focus }) =>
      [
        `Review the design of ${target}${focus ? `, focusing on ${focus}` : ""}. Read the code first.`,
        "Check, using the pocket-design tools:",
        "1. Contrast: run check_contrast on every text/background pair you find. Report WCAG ratio and APCA Lc, and use the suggested color when one fails.",
        "2. Type: compare font sizes with a type_scale; flag sizes that are off-scale or too many distinct sizes.",
        "3. Spacing: compare paddings, margins and gaps with a spacing_scale; flag values that break the rhythm.",
        "4. Icons: check that all icons come from one set; if not, propose replacements with search_icons in the dominant set.",
        "5. Motion: replace ad-hoc easings or durations with get_easing curves or springs.",
        "List each finding with file and line, then apply the fixes only after I confirm.",
      ].join("\n"),
  },
  {
    name: "build_section",
    title: "Build a landing page section",
    description: "Builds a polished landing page section (hero, features, pricing, testimonials, FAQ, CTA) using tokens, fonts, icons, components and backgrounds from this server.",
    args: {
      section: z.string().describe("hero, features, pricing, testimonials, faq, cta or footer"),
      brand: z.string().optional().describe("Brand name, primary color (hex) and mood, e.g. 'Acme, #4f46e5, calm and premium'"),
      stack: z.string().optional().describe("E.g. Next.js + Tailwind v4 + shadcn (default: what the project already uses)"),
    },
    build: ({ section, brand, stack }) =>
      [
        `Build a ${section} section${brand ? ` for ${brand}` : ""}${stack ? ` with ${stack}` : " using the project's existing stack"}.`,
        "Steps:",
        "1. If the project has no tokens yet, call export_tokens with the brand colors (format matching the stack) and add them.",
        "2. Pick fonts with search_fonts (prefer the selfHost option for Next.js/Vite) and a type_scale for headings.",
        "3. Find icons with search_icons in a single set and convert them with svg_to_react if the project uses React.",
        "4. Look for a matching component with search_components (shadcn, reactbits, motion-primitives, fancy) before writing one from scratch.",
        "5. Add depth with make_shadows and, if it fits, a subtle make_pattern or easing_gradient background.",
        "6. Use get_easing for entrance animations; respect prefers-reduced-motion.",
        "7. Verify every text color with check_contrast before finishing.",
        "Keep it responsive and accessible (semantic HTML, focus states, alt text).",
      ].join("\n"),
  },
  {
    name: "brand_kit",
    title: "Create a brand kit",
    description: "Turns one color and a mood into a complete starter kit: palette, type scale, fonts, spacing, shadows and exported tokens.",
    args: {
      color: z.string().describe("Primary color in hex, e.g. #0ea5e9"),
      mood: z.string().optional().describe("E.g. playful, editorial, technical, luxury"),
      format: z.string().optional().describe("css, tailwind or dtcg (default tailwind)"),
    },
    build: ({ color, mood, format }) =>
      [
        `Create a brand kit from ${color}${mood ? ` with a ${mood} mood` : ""}.`,
        "1. make_palette for the primary color; pick a neutral and an accent from the harmony results.",
        "2. check_contrast for text on the main backgrounds (light and dark) and adjust if needed.",
        `3. search_fonts for a heading and a body font that fit the mood; explain the pairing in one line.`,
        "4. type_scale, spacing_scale and make_shadows (tinted with the neutral color).",
        `5. export_tokens with all colors and fonts in ${format ?? "tailwind"} format.`,
        "Present the kit as a short summary plus the exported tokens, ready to paste.",
      ].join("\n"),
  },
  {
    name: "unify_icons",
    title: "Unify icons in a project",
    description: "Finds every icon in a file or folder and swaps them for one consistent set.",
    args: {
      path: z.string().describe("File or folder to scan"),
      set: z.string().optional().describe("Target set alias or prefix, e.g. lucide, phosphor, tabler (default: the most used one)"),
    },
    build: ({ path, set }) =>
      [
        `Scan ${path} for icons (SVG inline, icon components, icon fonts, emoji used as icons).`,
        `Target set: ${set ?? "the one already used most"}. Use list_icon_sets if you need to confirm the prefix.`,
        "For each icon, find the closest match with search_icons in the target set, get it with get_icon, and convert with svg_to_react when the project uses React.",
        "Show a table of old icon → new icon before changing any file.",
      ].join("\n"),
  },
];
