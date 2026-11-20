#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CATALOG } from "./catalog.js";
import { contrast, harmony, shades, type Harmony } from "./color.js";
import {
  getComponent,
  getIcon,
  ICON_SETS,
  optimizeSvg,
  searchComponents,
  searchFonts,
  searchIcons,
  searchImages,
  type IconSet,
} from "./sources.js";

const server = new McpServer({ name: "pocket-design", version: "0.1.0" });

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

// Erros viram resposta legível em vez de derrubar a chamada.
const safe =
  <A,>(fn: (args: A) => Promise<unknown> | unknown) =>
  async (args: A) => {
    try {
      return text(await fn(args));
    } catch (e) {
      return { ...text(`Erro: ${(e as Error).message}`), isError: true };
    }
  };

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

server.registerTool(
  "list_resources",
  {
    title: "Catálogo de recursos",
    description:
      "Lista os recursos de design do catálogo (referências, imagens, componentes, ícones, fontes, motion, 3D, áudio...). " +
      "O campo `access` diz se uma ferramenta deste MCP cobre o recurso (tool:...), se ele tem MCP oficial (mcp) ou se é só link. " +
      "Use para indicar onde buscar inspiração ou qual ferramenta usar.",
    inputSchema: {
      category: z.string().optional().describe("Filtra por categoria, ex.: Icons, Fonts, Motion"),
      pricing: z.enum(["free", "freemium", "paid"]).optional(),
      query: z.string().optional().describe("Busca no nome"),
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
    title: "Buscar ícones",
    description:
      "Busca ícones em Phosphor, Hugeicons, Feather e Pixelarticons (via Iconify, grátis). Devolve nomes no formato prefixo:nome; " +
      "use get_icon para pegar o SVG. Busque em inglês (house, arrow, settings).",
    inputSchema: {
      query: z.string().min(1).describe("Termo em inglês"),
      sets: z.array(z.enum(Object.keys(ICON_SETS) as [IconSet, ...IconSet[]])).optional().describe("Padrão: todos"),
      limit: z.number().int().min(1).max(100).default(24),
    },
    annotations: readOnly,
  },
  safe(({ query, sets, limit }) => searchIcons(query, sets ?? [], limit)),
);

server.registerTool(
  "get_icon",
  {
    title: "Pegar SVG do ícone",
    description: "Devolve o SVG pronto de um ícone, ex.: ph:house, hugeicons:home-01, feather:home, pixelarticons:home.",
    inputSchema: {
      name: z.string().describe("prefixo:nome"),
      size: z.number().int().min(8).max(512).optional().describe("Altura em px; padrão 1em"),
      color: z.string().optional().describe("Cor, ex.: #111827 (padrão currentColor)"),
    },
    annotations: readOnly,
  },
  safe(({ name, size, color }) => getIcon(name, { size, color })),
);

server.registerTool(
  "search_fonts",
  {
    title: "Buscar fontes",
    description:
      "Busca fontes grátis no Google Fonts e no Fontshare. Devolve pesos, se é variável, o link do CSS para colar no <head> e a página da fonte. " +
      "Sem query, traz as mais populares da categoria.",
    inputSchema: {
      query: z.string().optional().describe("Nome ou parte do nome, ex.: inter, satoshi"),
      category: z.string().optional().describe("Ex.: sans, serif, display, mono, handwriting"),
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
    title: "Buscar imagens",
    description: "Busca fotos, ilustrações e vetores grátis na Pixabay. Precisa da variável PIXABAY_API_KEY (chave grátis).",
    inputSchema: {
      query: z.string().min(1).describe("Termo de busca (inglês dá mais resultado)"),
      type: z.enum(["all", "photo", "illustration", "vector"]).default("photo"),
      orientation: z.enum(["all", "horizontal", "vertical"]).default("all"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    annotations: readOnly,
  },
  safe((args) => searchImages(args)),
);

server.registerTool(
  "search_components",
  {
    title: "Buscar componentes shadcn/ui",
    description: "Lista componentes, blocos e hooks do registry oficial do shadcn/ui. Use get_component para ver o código.",
    inputSchema: {
      query: z.string().optional().describe("Ex.: dialog, sidebar, chart"),
      type: z.enum(["ui", "block", "hook", "lib", "example"]).optional(),
      limit: z.number().int().min(1).max(100).default(30),
    },
    annotations: readOnly,
  },
  safe(({ query, type, limit }) => searchComponents(query, type, limit)),
);

server.registerTool(
  "get_component",
  {
    title: "Código de um componente shadcn/ui",
    description:
      "Devolve o código, as dependências e o comando de instalação de um componente do shadcn/ui (estilo new-york-v4). " +
      "Num projeto que já usa shadcn, prefira rodar o comando `install`.",
    inputSchema: { name: z.string().describe("Ex.: button, dialog, sidebar-07") },
    annotations: readOnly,
  },
  safe(({ name }) => getComponent(name)),
);

server.registerTool(
  "optimize_svg",
  {
    title: "Otimizar SVG",
    description: "Otimiza um SVG com o svgo (o mesmo motor do SVGOMG), localmente. Devolve o SVG e o tamanho antes e depois.",
    inputSchema: {
      svg: z.string().min(1).describe("Código SVG completo"),
      precision: z.number().int().min(0).max(8).default(3).describe("Casas decimais nas coordenadas"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  safe(({ svg, precision }) => optimizeSvg(svg, precision)),
);

server.registerTool(
  "make_palette",
  {
    title: "Gerar paleta",
    description:
      "Gera, a partir de uma cor base, a escala 50–950 (estilo Tailwind, calculada em OKLCH) e cores harmônicas, " +
      "com o contraste WCAG de cada degrau contra branco e preto. Tudo local.",
    inputSchema: {
      base: z.string().describe("Cor base em hex, ex.: #3b82f6"),
      harmony: z
        .enum(["complementary", "analogous", "triadic", "split-complementary", "tetradic"])
        .default("complementary"),
      name: z.string().default("primary").describe("Nome da cor nas variáveis CSS"),
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
      note: "Contraste mínimo WCAG AA: 4.5 para texto normal, 3 para texto grande.",
    };
  }),
);

await server.connect(new StdioServerTransport());
