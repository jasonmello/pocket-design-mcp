import { optimize } from "svgo";
import { cached, getJson, getText } from "./http.js";

// ---------- Ícones (Iconify, sem chave) ----------

export const ICON_SETS = { phosphor: "ph", hugeicons: "hugeicons", feather: "feather", pixelarticons: "pixelarticons" } as const;
export type IconSet = keyof typeof ICON_SETS;

// O Feather (Cole Bemis) existe no Iconify mas fica fora do índice de busca;
// por isso buscamos na lista completa do set (286 ícones) e filtramos aqui.
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
    // A API do Iconify aceita limit mínimo 32; cortamos depois.
    const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${indexed.join(",")}&limit=${Math.max(32, limit)}`;
    icons.push(...(await getJson<{ icons: string[] }>(url)).icons);
  }
  return { found: icons.length, icons: icons.slice(0, limit) };
}

export async function getIcon(name: string, opts: { size?: number; color?: string }) {
  const m = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(name.trim());
  if (!m) throw new Error(`Nome inválido "${name}". Use prefixo:nome, ex.: ph:house`);
  const qs = new URLSearchParams();
  if (opts.size) qs.set("height", String(opts.size));
  if (opts.color) qs.set("color", opts.color);
  const svg = await getText(`https://api.iconify.design/${m[1]}/${m[2]}.svg?${qs}`);
  if (svg.trim() === "404" || !svg.includes("<svg")) throw new Error(`Ícone não encontrado: ${name}`);
  return svg;
}

// ---------- Fontes (Google Fonts metadata pública + Fontshare API) ----------

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

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function searchFonts(opts: {
  query?: string;
  category?: string;
  source: "all" | "google" | "fontshare";
  limit: number;
}): Promise<FontHit[]> {
  const q = norm(opts.query ?? "");
  const cat = opts.category ? norm(opts.category) : "";
  const hits: FontHit[] = [];

  if (opts.source !== "fontshare") {
    const fams = await googleFamilies();
    const matches = fams
      .filter((f) => (!q || norm(f.family).includes(q)) && (!cat || norm(f.category).includes(cat)))
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
    // Fontshare só filtra por texto; sem texto, traz os mais populares.
    const url = q ? `https://api.fontshare.com/v2/fonts?q=${encodeURIComponent(q)}` : "https://api.fontshare.com/v2/fonts";
    const data = await getJson<{ fonts: FontshareFont[] }>(url);
    const matches = data.fonts.filter(
      (f) => !cat || norm(f.category).includes(cat) || f.font_tags.some((t) => norm(t.name).includes(cat)),
    );
    for (const f of matches.slice(0, opts.limit)) {
      // Estilos variáveis vêm com peso 0; ficam só no campo `variable`.
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

// ---------- Imagens (Pixabay, chave grátis) ----------

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
      "Falta a variável PIXABAY_API_KEY. A chave é grátis: crie uma conta em https://pixabay.com/api/docs/ e passe a chave no registro do MCP.",
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
    note: "Licença Pixabay: uso grátis, sem atribuição obrigatória. Baixe e hospede a imagem você mesmo; não use as URLs da Pixabay direto em produção.",
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

// ---------- Componentes (registry público do shadcn/ui) ----------

const SHADCN = "https://ui.shadcn.com/r";
const SHADCN_STYLE = "new-york-v4";

interface ShadcnIndexItem {
  name: string;
  type: string;
  description?: string;
  registryDependencies?: string[];
}

const shadcnIndex = () => cached("shadcn-index", () => getJson<ShadcnIndexItem[]>(`${SHADCN}/index.json`));

export async function searchComponents(query: string | undefined, type: string | undefined, limit: number) {
  const q = norm(query ?? "");
  const items = await shadcnIndex();
  return items
    .filter((i) => (!q || norm(i.name).includes(q) || norm(i.description ?? "").includes(q)) && (!type || i.type === `registry:${type}`))
    .slice(0, limit)
    .map((i) => ({ name: i.name, type: i.type.replace("registry:", ""), description: i.description, uses: i.registryDependencies }));
}

interface ShadcnItem {
  name: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: { path: string; content: string; type: string }[];
}

export async function getComponent(name: string) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Nome inválido: ${name}`);
  const item = await getJson<ShadcnItem>(`${SHADCN}/styles/${SHADCN_STYLE}/${name}.json`);
  return {
    name: item.name,
    install: `npx shadcn@latest add ${item.name}`,
    npmDependencies: item.dependencies ?? [],
    otherComponents: item.registryDependencies ?? [],
    files: item.files.map((f) => ({ path: f.path, content: f.content })),
  };
}

// ---------- SVG (svgo local, o mesmo motor do SVGOMG) ----------

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
