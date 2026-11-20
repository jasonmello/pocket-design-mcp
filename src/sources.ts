import { optimize } from "svgo";
import { cached, getJson, getText } from "./http.js";

// ---------- Icons (Iconify, no key) ----------

export const ICON_SETS = { phosphor: "ph", hugeicons: "hugeicons", feather: "feather", pixelarticons: "pixelarticons" } as const;
export type IconSet = keyof typeof ICON_SETS;

// Feather (Cole Bemis) is on Iconify but missing from its search index,
// so we fetch the full set list (286 icons) and filter it here.
const featherNames = () =>
  cached("feather-list", async () => {
    const data = await getJson<{ uncategorized?: string[]; categories?: Record<string, string[]> }>(
      "https://api.iconify.design/collection?prefix=feather",
    );
    return [...new Set([...(data.uncategorized ?? []), ...Object.values(data.categories ?? {}).flat()])];
  });

export async function searchIcons(query: string, sets: IconSet[], limit: number) {
  const chosen = sets.length ? sets : (Object.keys(ICON_SETS) as IconSet[]);
  const indexed = chosen.filter((s) => s !== "feather").map((s) => ICON_SETS[s]);
  const icons: string[] = [];

  if (chosen.includes("feather")) {
    const q = query.toLowerCase().trim().replace(/\s+/g, "-");
    icons.push(...(await featherNames()).filter((n) => n.includes(q)).map((n) => `feather:${n}`));
  }
  if (indexed.length) {
    // Iconify's minimum limit is 32; we trim afterwards.
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${indexed.join(",")}&limit=${Math.max(32, limit)}`;
    icons.push(...(await getJson<{ icons: string[] }>(url)).icons);
  }
  return { found: icons.length, icons: icons.slice(0, limit) };
}

export async function getIcon(name: string, opts: { size?: number; color?: string }) {
  const m = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(name.trim());
  if (!m) throw new Error(`Invalid name "${name}". Use prefix:name, e.g. ph:house`);
  const qs = new URLSearchParams();
  if (opts.size) qs.set("height", String(opts.size));
  if (opts.color) qs.set("color", opts.color);
  const svg = await getText(`https://api.iconify.design/${m[1]}/${m[2]}.svg?${qs}`).catch((e: Error) => {
    if (e.message.startsWith("HTTP 404")) throw new Error(`Icon not found: ${name}. Use search_icons to find valid names.`);
    throw e;
  });
  if (svg.trim() === "404" || !svg.includes("<svg")) throw new Error(`Icon not found: ${name}`);
  return svg;
}

// ---------- Fonts (public Google Fonts metadata + Fontshare API) ----------

interface GoogleFamily {
  family: string;
  category: string;
  fonts: Record<string, unknown>;
  axes: { tag: string; min: number; max: number }[];
  popularity: number;
  subsets: string[];
}

const googleFamilies = () =>
  cached("google-fonts", async () => {
    const raw = await getText("https://fonts.google.com/metadata/fonts", 30000);
    const json = JSON.parse(raw.replace(/^\)\]\}'?\s*/, "")) as { familyMetadataList: GoogleFamily[] };
    return json.familyMetadataList;
  });

interface FontshareFont {
  name: string;
  slug: string;
  category: string;
  font_tags: { name: string }[];
  styles: { weight: { weight: number }; is_italic: boolean; is_variable: boolean }[];
  license_type: string;
}

export interface FontHit {
  source: "google" | "fontshare";
  family: string;
  category: string;
  weights: number[];
  variable: boolean;
  css: string;
  page: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// One vocabulary for both sources: "Sans Serif" (Google) and "Sans" (Fontshare) are both "sans".
const CATEGORY_ALIASES: Record<string, string> = {
  "sans serif": "sans",
  "sans-serif": "sans",
  monospace: "mono",
  handwritten: "handwriting",
  script: "handwriting",
};
const canonCategory = (c: string) => {
  const n = norm(c).trim().replace(/\s+/g, " ");
  return CATEGORY_ALIASES[n] ?? n;
};
/** True if any of the font's categories (Fontshare lists several, comma-separated) matches. */
const categoryMatches = (fontCategory: string, wanted: string) =>
  fontCategory.split(",").some((c) => canonCategory(c) === canonCategory(wanted));

export async function searchFonts(opts: {
  query?: string;
  category?: string;
  source: "all" | "google" | "fontshare";
  limit: number;
}): Promise<FontHit[]> {
  const q = norm(opts.query ?? "");
  const cat = opts.category ?? "";
  const hits: FontHit[] = [];

  if (opts.source !== "fontshare") {
    const fams = await googleFamilies();
    const matches = fams
      .filter((f) => (!q || norm(f.family).includes(q)) && (!cat || categoryMatches(f.category, cat)))
      .sort((a, b) => a.popularity - b.popularity);
    for (const f of matches.slice(0, opts.limit)) {
      const weights = [...new Set(Object.keys(f.fonts).map((k) => parseInt(k, 10)))].sort((a, b) => a - b);
      const wght = f.axes.find((a) => a.tag === "wght");
      const spec = wght ? `wght@${wght.min}..${wght.max}` : `wght@${weights.join(";")}`;
      hits.push({
        source: "google",
        family: f.family,
        category: f.category,
        weights,
        variable: f.axes.length > 0,
        css: `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, "+")}:${spec}&display=swap`,
        page: `https://fonts.google.com/specimen/${f.family.replace(/ /g, "+")}`,
      });
    }
  }

  if (opts.source !== "google") {
    // Fontshare only filters by text; without text it returns the most popular.
    const url = q ? `https://api.fontshare.com/v2/fonts?q=${encodeURIComponent(q)}` : "https://api.fontshare.com/v2/fonts";
    const data = await getJson<{ fonts: FontshareFont[] }>(url);
    const matches = data.fonts.filter(
      (f) => !cat || categoryMatches(f.category, cat) || f.font_tags.some((t) => canonCategory(t.name) === canonCategory(cat)),
    );
    for (const f of matches.slice(0, opts.limit)) {
      // Variable styles come with weight 0; they only set `variable`.
      const weights = [...new Set(f.styles.filter((s) => !s.is_variable).map((s) => s.weight.weight))].sort((a, b) => a - b);
      hits.push({
        source: "fontshare",
        family: f.name,
        category: f.category,
        weights,
        variable: f.styles.some((s) => s.is_variable),
        css: `https://api.fontshare.com/v2/css?f[]=${f.slug}@${weights.join(",")}&display=swap`,
        page: `https://www.fontshare.com/fonts/${f.slug}`,
      });
    }
  }
  return hits;
}

// ---------- Images (Pixabay, free key) ----------

interface PixabayHit {
  id: number;
  pageURL: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

export async function searchImages(opts: {
  query: string;
  type: "all" | "photo" | "illustration" | "vector";
  orientation: "all" | "horizontal" | "vertical";
  limit: number;
}) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    throw new Error(
      "Missing PIXABAY_API_KEY. The key is free: create an account at https://pixabay.com/api/docs/ and pass it when registering the MCP.",
    );
  }
  const qs = new URLSearchParams({
    key,
    q: opts.query.slice(0, 100),
    image_type: opts.type,
    orientation: opts.orientation,
    safesearch: "true",
    per_page: String(Math.min(200, Math.max(3, opts.limit))),
  });
  const data = await getJson<{ totalHits: number; hits: PixabayHit[] }>(`https://pixabay.com/api/?${qs}`);
  return {
    totalHits: data.totalHits,
    note: "Pixabay license: free to use, no attribution required. Download and host the image yourself; do not hotlink Pixabay URLs in production.",
    images: data.hits.slice(0, opts.limit).map((h) => ({
      page: h.pageURL,
      tags: h.tags,
      preview: h.previewURL,
      medium: h.webformatURL,
      large: h.largeImageURL,
      size: `${h.imageWidth}x${h.imageHeight}`,
      author: h.user,
    })),
  };
}

// ---------- Components (public shadcn-format registries) ----------
// All follow the shadcn registry schema, so the same code reads all four and
// `npx shadcn@latest add <url>` installs into any project that uses shadcn.

export const REGISTRIES = {
  shadcn: {
    label: "shadcn/ui",
    index: "https://ui.shadcn.com/r/index.json",
    item: (n: string) => `https://ui.shadcn.com/r/styles/new-york-v4/${n}.json`,
    install: (n: string) => `npx shadcn@latest add ${n}`,
  },
  reactbits: {
    label: "React Bits (animations, text, backgrounds)",
    index: "https://reactbits.dev/r/registry.json",
    item: (n: string) => `https://reactbits.dev/r/${n}.json`,
    install: (n: string) => `npx shadcn@latest add https://reactbits.dev/r/${n}.json`,
  },
  "motion-primitives": {
    label: "Motion Primitives (animated components with Motion)",
    index: "https://motion-primitives.com/c/registry.json",
    item: (n: string) => `https://motion-primitives.com/c/${n}.json`,
    install: (n: string) => `npx shadcn@latest add https://motion-primitives.com/c/${n}.json`,
  },
  fancy: {
    label: "Fancy Components (effects and micro-interactions)",
    index: "https://www.fancycomponents.dev/r/registry.json",
    item: (n: string) => `https://www.fancycomponents.dev/r/${n}.json`,
    install: (n: string) => `npx shadcn@latest add https://www.fancycomponents.dev/r/${n}.json`,
  },
} as const;
export type RegistryId = keyof typeof REGISTRIES;

interface RegistryIndexItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  registryDependencies?: string[];
}

const registryIndex = (id: RegistryId) =>
  cached(`registry-${id}`, async () => {
    const data = await getJson<RegistryIndexItem[] | { items: RegistryIndexItem[] }>(REGISTRIES[id].index, 30000);
    let items = Array.isArray(data) ? data : data.items;
    // React Bits ships 4 variants of each (JS/TS x CSS/Tailwind); we only show TS + Tailwind.
    if (id === "reactbits") items = items.filter((i) => i.name.endsWith("-TS-TW"));
    return items;
  });

export async function searchComponents(opts: {
  query?: string;
  registries: RegistryId[];
  type?: string;
  limit: number;
}) {
  const q = norm(opts.query ?? "");
  const ids = opts.registries.length ? opts.registries : (Object.keys(REGISTRIES) as RegistryId[]);
  const results = await Promise.allSettled(ids.map(async (id) => ({ id, items: await registryIndex(id) })));
  const hits: { registry: RegistryId; name: string; type: string; description?: string }[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") return void failed.push(ids[i]);
    for (const it of r.value.items) {
      const text = norm(`${it.name} ${it.title ?? ""} ${it.description ?? ""}`);
      if ((!q || text.includes(q)) && (!opts.type || it.type === `registry:${opts.type}`)) {
        hits.push({ registry: r.value.id, name: it.name, type: it.type.replace("registry:", ""), description: it.description });
      }
    }
  });
  return { found: hits.length, components: hits.slice(0, opts.limit), ...(failed.length ? { unavailable: failed } : {}) };
}

interface RegistryItem {
  name: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: { path: string; content?: string; type: string }[];
}

export async function getComponent(name: string, registry: RegistryId) {
  if (!/^[A-Za-z0-9-]+$/.test(name)) throw new Error(`Invalid name: ${name}`);
  const reg = REGISTRIES[registry];
  const item = await getJson<RegistryItem>(reg.item(name)).catch((e: Error) => {
    if (e.message.startsWith("HTTP 404")) throw new Error(`Component not found in ${registry}: ${name}. Use search_components to find valid names.`);
    throw e;
  });
  return {
    registry,
    name: item.name,
    description: item.description,
    install: reg.install(item.name),
    npmDependencies: item.dependencies ?? [],
    otherComponents: item.registryDependencies ?? [],
    files: item.files.map((f) => ({ path: f.path, content: f.content ?? "" })),
  };
}

// ---------- SVG (local svgo, the engine behind SVGOMG) ----------

export function optimizeSvg(svg: string, precision: number) {
  const out = optimize(svg, {
    multipass: true,
    floatPrecision: precision,
    plugins: [
      { name: "preset-default", params: { overrides: {} } },
      "removeDimensions",
    ],
  });
  return { svg: out.data, before: Buffer.byteLength(svg), after: Buffer.byteLength(out.data) };
}
