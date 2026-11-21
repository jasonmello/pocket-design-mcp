import { cached, getJson, getText } from "./http.js";

// ---------- Icons (Iconify, no key) ----------
// Any of Iconify's ~280 sets works. Friendly aliases map to Iconify prefixes.

export const ICON_ALIASES: Record<string, string> = {
  phosphor: "ph",
  lucide: "lucide",
  tabler: "tabler",
  hugeicons: "hugeicons",
  heroicons: "heroicons",
  solar: "solar",
  material: "material-symbols",
  feather: "feather",
  pixelarticons: "pixelarticons",
  brands: "simple-icons",
  logos: "logos",
  emoji: "fluent-emoji-flat",
  flags: "flag",
};

/** Sets searched when the caller does not pick any: popular UI sets with a consistent style. */
export const DEFAULT_ICON_SETS = ["ph", "lucide", "tabler", "hugeicons", "heroicons", "solar", "feather", "pixelarticons"];

const PREFIX = /^[a-z0-9-]+$/;
const toPrefix = (s: string) => {
  const p = ICON_ALIASES[s.toLowerCase()] ?? s.toLowerCase();
  if (!PREFIX.test(p)) throw new Error(`Invalid icon set "${s}". Use list_icon_sets to see valid ones.`);
  return p;
};

interface IconifyCollection {
  name: string;
  total: number;
  category?: string;
  license?: { title: string; spdx?: string };
  samples?: string[];
  palette?: boolean;
  hidden?: boolean;
}

const collections = () =>
  cached("iconify-collections", () =>
    getJson<Record<string, IconifyCollection>>("https://api.iconify.design/collections?hidden=true"),
  );

export async function listIconSets(query: string | undefined, category: string | undefined, limit: number) {
  const all = await collections();
  const q = (query ?? "").toLowerCase();
  const c = (category ?? "").toLowerCase();
  const aliasOf = Object.fromEntries(Object.entries(ICON_ALIASES).map(([a, p]) => [p, a]));
  const sets = Object.entries(all)
    .filter(([prefix, s]) => (!q || prefix.includes(q) || s.name.toLowerCase().includes(q)) && (!c || (s.category ?? "").toLowerCase().includes(c)))
    // Exact prefix or alias first, then the biggest sets.
    .sort((a, b) => Number(b[0] === q || aliasOf[b[0]] === q) - Number(a[0] === q || aliasOf[a[0]] === q) || b[1].total - a[1].total)
    .map(([prefix, s]) => ({
      prefix,
      ...(aliasOf[prefix] ? { alias: aliasOf[prefix] } : {}),
      name: s.name,
      icons: s.total,
      category: s.category,
      license: s.license?.spdx ?? s.license?.title,
      multicolor: !!s.palette,
      samples: s.samples?.slice(0, 4),
    }));
  return { found: sets.length, categories: [...new Set(Object.values(all).map((s) => s.category).filter(Boolean))], sets: sets.slice(0, limit) };
}

// Some sets (Feather, Fluent Emoji...) are on Iconify but hidden from its search index,
// so for those we fetch the set's name list and filter it here.
const setNames = (prefix: string) =>
  cached(`iconify-list-${prefix}`, async () => {
    const data = await getJson<{ uncategorized?: string[]; categories?: Record<string, string[]> }>(
      `https://api.iconify.design/collection?prefix=${prefix}`,
    );
    return [...new Set([...(data.uncategorized ?? []), ...Object.values(data.categories ?? {}).flat()])];
  });

export async function searchIcons(query: string, sets: string[], limit: number) {
  const chosen = (sets.length ? sets : DEFAULT_ICON_SETS).map(toPrefix);
  const all = await collections();
  const unknown = chosen.filter((p) => !all[p]);
  if (unknown.length) throw new Error(`Unknown icon set: ${unknown.join(", ")}. Use list_icon_sets to see valid ones.`);
  const hidden = chosen.filter((p) => all[p].hidden);
  const indexed = chosen.filter((p) => !all[p].hidden);
  const icons: string[] = [];

  const q = query.toLowerCase().trim().replace(/\s+/g, "-");
  for (const p of hidden) icons.push(...(await setNames(p)).filter((n) => n.includes(q)).map((n) => `${p}:${n}`));
  if (indexed.length) {
    // Iconify's minimum limit is 32; we trim afterwards.
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${indexed.join(",")}&limit=${Math.max(32, limit)}`;
    icons.push(...(await getJson<{ icons: string[] }>(url)).icons);
  }
  // Iconify returns results grouped by set; interleave them so several sets show up in the first results.
  const bySet = new Map<string, string[]>();
  for (const i of icons) {
    const p = i.slice(0, i.indexOf(":"));
    bySet.set(p, [...(bySet.get(p) ?? []), i]);
  }
  const mixed: string[] = [];
  for (let k = 0; mixed.length < icons.length; k++) for (const list of bySet.values()) if (list[k]) mixed.push(list[k]);
  return { found: icons.length, icons: mixed.slice(0, limit) };
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
  source: "google" | "fontshare" | "fontsource";
  family: string;
  category: string;
  weights: number[];
  variable: boolean;
  /** Link to paste in <head>; absent for fonts only available as npm packages. */
  css?: string;
  page: string;
  /** Self-hosting through Fontsource (better for Next.js/Vite: no external request). */
  selfHost?: { install: string; import: string; cssFamily: string };
}

interface FontsourceFont {
  id: string;
  family: string;
  weights: number[];
  variable: boolean;
  category: string;
  type: "google" | "other";
  license: string;
}

const fontsourceFonts = () =>
  cached("fontsource", async () => {
    const list = await getJson<FontsourceFont[]>("https://api.fontsource.org/v1/fonts", 30000);
    return new Map(list.filter((f) => f.category !== "icons").map((f) => [f.id, f]));
  });

const selfHost = (f: FontsourceFont) =>
  f.variable
    ? { install: `npm i @fontsource-variable/${f.id}`, import: `import "@fontsource-variable/${f.id}";`, cssFamily: `"${f.family} Variable"` }
    : { install: `npm i @fontsource/${f.id}`, import: `import "@fontsource/${f.id}";`, cssFamily: `"${f.family}"` };

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
  source: "all" | "google" | "fontshare" | "fontsource";
  limit: number;
}): Promise<FontHit[]> {
  const q = norm(opts.query ?? "");
  const cat = opts.category ?? "";
  const hits: FontHit[] = [];
  // Fontsource is optional enrichment: if it is down, Google and Fontshare still answer.
  const fsMap = await fontsourceFonts().catch(() => new Map<string, FontsourceFont>());

  if (opts.source === "all" || opts.source === "google") {
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
        ...(fsMap.get(f.family.toLowerCase().replace(/ /g, "-")) ? { selfHost: selfHost(fsMap.get(f.family.toLowerCase().replace(/ /g, "-"))!) } : {}),
      });
    }
  }

  // Fontsource also hosts open fonts that are not on Google Fonts (type "other").
  if (opts.source === "all" || opts.source === "fontsource") {
    const pool = [...fsMap.values()].filter(
      (f) => (opts.source === "fontsource" || f.type === "other") && (!q || norm(f.family).includes(q)) && (!cat || categoryMatches(f.category, cat)),
    );
    for (const f of pool.slice(0, opts.limit)) {
      hits.push({
        source: "fontsource",
        family: f.family,
        category: f.category,
        weights: f.weights,
        variable: f.variable,
        page: `https://fontsource.org/fonts/${f.id}`,
        selfHost: selfHost(f),
      });
    }
  }

  if (opts.source === "all" || opts.source === "fontshare") {
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

// ---------- Images (Wikimedia Commons and Openverse, no key; Pixabay with a free key) ----------

interface PixabayHit {
  pageURL: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
}

interface OpenverseHit {
  title: string;
  foreign_landing_url: string;
  url: string;
  thumbnail: string;
  creator: string | null;
  license: string;
  license_version: string;
  license_url: string;
  attribution: string;
  width: number | null;
  height: number | null;
  provider: string;
  category: string | null;
  mature: boolean;
}

export interface ImageSearch {
  query: string;
  source: "auto" | "wikimedia" | "openverse" | "pixabay";
  type: "all" | "photo" | "illustration" | "vector";
  orientation: "all" | "horizontal" | "vertical";
  commercial: boolean;
  limit: number;
}

export async function searchImages(opts: ImageSearch) {
  const key = process.env.PIXABAY_API_KEY;
  if (opts.source === "pixabay" || (opts.source === "auto" && key)) return pixabay(opts, key);
  if (opts.source === "openverse") return openverse(opts);
  if (opts.source === "wikimedia") return wikimedia(opts);
  // auto without a key: Wikimedia Commons is fast and reliable; Openverse covers more (Flickr...) but is often slow.
  const first = await wikimedia(opts).catch(() => null);
  if (first && first.images.length) return first;
  return openverse(opts);
}

interface CommonsPage {
  title: string;
  imageinfo?: {
    url: string;
    descriptionurl: string;
    thumburl?: string;
    width: number;
    height: number;
    extmetadata?: Record<string, { value: string }>;
  }[];
}

const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function wikimedia(opts: ImageSearch) {
  // Commons only accepts free licenses (no NC), so every result is fine for commercial use.
  const kind = opts.type === "vector" ? "filetype:drawing" : "filetype:bitmap";
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${opts.query.slice(0, 200)} ${kind}`,
    // Orientation is filtered locally, so ask for more candidates when it is set.
    gsrlimit: String(opts.orientation === "all" ? Math.min(50, opts.limit * 3) : 50),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: "640",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|AttributionRequired|ObjectName",
  });
  const data = await getJson<{ query?: { pages: Record<string, CommonsPage & { index: number }> } }>(
    `https://commons.wikimedia.org/w/api.php?${qs}`,
  );
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const images = pages
    .map((p) => ({ p, i: p.imageinfo?.[0] }))
    .filter(({ i }) => {
      if (!i) return false;
      if (opts.orientation === "horizontal" && i.width <= i.height) return false;
      if (opts.orientation === "vertical" && i.height <= i.width) return false;
      return true;
    })
    .slice(0, opts.limit)
    .map(({ p, i }) => {
      const m = i!.extmetadata ?? {};
      const title = stripHtml(m.ObjectName?.value) || p.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "");
      const author = stripHtml(m.Artist?.value) || undefined;
      const license = stripHtml(m.LicenseShortName?.value) || undefined;
      return {
        title,
        page: i!.descriptionurl,
        preview: i!.thumburl,
        full: i!.url.split("?")[0],
        size: `${i!.width}x${i!.height}`,
        author,
        license,
        licenseUrl: m.LicenseUrl?.value,
        attribution: m.AttributionRequired?.value === "false" ? undefined : `"${title}"${author ? ` by ${author}` : ""}${license ? `, ${license}` : ""}, via Wikimedia Commons`,
      };
    });
  return {
    source: "wikimedia",
    totalHits: pages.length,
    note: "Wikimedia Commons only hosts freely licensed files. Show the `attribution` text near the image when present (CC BY / BY-SA).",
    images,
  };
}

async function openverse(opts: ImageSearch) {
  // Openverse's server-side filters are slow (often 10-17 s, sometimes 504), so we fetch the
  // maximum anonymous page with just the query and filter license, type and shape here.
  const qs = new URLSearchParams({ q: opts.query.slice(0, 200), page_size: "20" });
  const url = `https://api.openverse.org/v1/images/?${qs}`;
  const data = await getJson<{ result_count: number; results: OpenverseHit[] }>(url, 30000).catch(() =>
    getJson<{ result_count: number; results: OpenverseHit[] }>(url, 30000),
  );
  const category = { all: null, photo: "photograph", illustration: "illustration", vector: "illustration" }[opts.type];
  const results = data.results.filter((h) => {
    if (h.mature) return false;
    if (opts.commercial && /nc/.test(h.license)) return false;
    if (category && h.category && h.category !== category) return false;
    if (opts.orientation !== "all" && h.width && h.height) {
      if (opts.orientation === "horizontal" && h.width <= h.height) return false;
      if (opts.orientation === "vertical" && h.height <= h.width) return false;
    }
    return true;
  });
  return {
    source: "openverse",
    totalHits: data.result_count,
    note:
      "Openverse indexes Creative Commons images. Licenses vary: keep the `attribution` text near the image unless the license is cc0 or pdm. " +
      (opts.commercial ? "Filtered to licenses that allow commercial use." : "Includes non-commercial licenses."),
    images: results.slice(0, opts.limit).map((h) => ({
      title: h.title,
      page: h.foreign_landing_url,
      preview: h.thumbnail,
      full: h.url,
      size: h.width && h.height ? `${h.width}x${h.height}` : undefined,
      author: h.creator ?? undefined,
      license: `${h.license.toUpperCase()} ${h.license_version}`.trim(),
      licenseUrl: h.license_url,
      attribution: h.attribution,
      provider: h.provider,
    })),
  };
}

async function pixabay(opts: ImageSearch, key: string | undefined) {
  if (!key) {
    throw new Error(
      "Missing PIXABAY_API_KEY. The key is free: create an account at https://pixabay.com/api/docs/ and pass it when registering the MCP. Or use source: openverse, which needs no key.",
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
    source: "pixabay",
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
