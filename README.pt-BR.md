# pocket-design-mcp

[English](README.md) · **Português**

MCP grátis que dá ao seu agente de código (Claude Code, Claude Desktop, Cursor...) uma caixa de ferramentas de designer: ícones de 280 sets, fontes, imagens, componentes, tokens de design, easings, checagem de contraste, ferramentas de SVG e padrões de fundo. Você pede ("coloca um ícone de casa do Lucide no header", "gera os tokens a partir de #4f46e5", "deixa a sombra desse card mais suave") e o agente busca e já aplica no código.

Não precisa de nenhuma chave de API.

> Inspirado no [Rei do Photoshop](https://resources.cesaroeduardo.com/).

## Instalar

Claude Code:

```bash
claude mcp add pocket-design --scope user -- npx -y pocket-design-mcp
```

Claude Desktop (`claude_desktop_config.json`) ou Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pocket-design": { "command": "npx", "args": ["-y", "pocket-design-mcp"] }
  }
}
```

Opcional: acrescente `"env": { "PIXABAY_API_KEY": "sua_chave" }` para buscar também na Pixabay (chave grátis em https://pixabay.com/api/docs/).

## Ferramentas

| Ferramenta | O que faz | Fonte |
|---|---|---|
| `search_icons` / `get_icon` | Qualquer um dos ~280 sets do Iconify: Lucide, Phosphor, Tabler, Material Symbols, Heroicons, Solar... e também logos de marcas, emoji e bandeiras | Iconify |
| `list_icon_sets` | Lista os sets com quantidade de ícones, licença e exemplos | Iconify |
| `svg_to_react` | Transforma um SVG em componente React tipado, com as props repassadas para a raiz | svgo, local |
| `optimize_svg` | Enxuga SVG (motor do SVGOMG) | svgo, local |
| `search_fonts` | Google Fonts, Fontshare e Fontsource, com o link do CSS e o pacote npm para hospedar a fonte no projeto | Google Fonts, Fontshare, Fontsource |
| `search_images` | Fotos e ilustrações de licença livre, com licença e crédito | Wikimedia Commons, Openverse, Pixabay (chave opcional) |
| `search_components` / `get_component` | Código e comando de instalação | shadcn/ui, React Bits, Motion Primitives, Fancy Components |
| `make_palette` | Escala 50–950 em OKLCH (a sua cor fica nela), harmonias e contraste WCAG | local |
| `check_contrast` | Razão WCAG 2 + Lc do APCA, com sugestão de correção | local |
| `type_scale` | Escala tipográfica fluida em CSS `clamp()`, com entrelinha e espaçamento entre letras | local |
| `spacing_scale` | Escala de espaçamento linear ou geométrica | local |
| `make_shadows` | Sombras de elevação em camadas (xs a 2xl) | local |
| `export_tokens` | Cores + tipografia + espaçamento + raios + sombras em variáveis CSS, `@theme` do Tailwind v4 ou JSON DTCG | local |
| `get_easing` | Curvas do easings.net em CSS, Motion e GSAP; molas em CSS `linear()` | local |
| `easing_gradient` | Gradientes suaves, sem a faixa dura | local |
| `make_pattern` / `make_blob` | Padrões SVG contínuos (grade, pontos, ondas, ruído...) e blobs orgânicos | local |
| `list_resources` | ~180 recursos de design selecionados e como chegar em cada um | local |

### Prompts

Os clientes que suportam prompts MCP mostram estes no menu:

- **design_review**: revisa uma tela (contraste, escala tipográfica, ritmo de espaçamento, consistência de ícones e animação).
- **build_section**: monta uma seção de landing page (hero, features, preços...) com tokens, fontes, ícones e componentes.
- **brand_kit**: transforma uma cor e um clima em paleta, fontes, escalas, sombras e tokens exportados.
- **unify_icons**: troca todos os ícones de uma pasta por um set só.

O catálogo também fica disponível como o recurso `pocket-design://catalog`.

## Falar em vez de digitar (tipo Wispr Flow, de graça)

O MCP não grava áudio. A voz vira texto antes de chegar no agente:

- **Ditado do macOS:** Ajustes do Sistema > Teclado > Ditado. Depois é só apertar o atalho (padrão: Fn duas vezes) em qualquer campo de texto.
- **VoiceInk:** app open source que roda o Whisper local no Mac, mais parecido com o Wispr Flow.

## Desenvolver

```bash
npm install
```

```bash
npm test
```

O teste sobe o servidor e chama cada ferramenta de verdade, então precisa de internet.

As versões saem sozinhas: suba o `version` do `package.json` num pull request, e o merge publica no npm (com proveniência) e cria a Release no GitHub.

## Licença

Código sob [Apache-2.0](LICENSE). Pode usar, modificar e redistribuir, inclusive em projetos comerciais e de código fechado, desde que mantenha os avisos de licença e de copyright e indique o que mudou. A licença também concede o uso das patentes dos contribuidores.

Os recursos que o MCP busca têm licenças próprias:

- Ícones: a licença de cada set aparece no `list_icon_sets` (a maioria é MIT, Apache ou ISC; logos de marcas pertencem às marcas).
- Fontes: licenças abertas (OFL e parecidas); o Fontshare usa a ITF Free Font License. Leia antes de publicar.
- Imagens: os resultados do Wikimedia Commons e do Openverse vêm com a licença Creative Commons de cada um; mostre o crédito quando ele for exigido. A Pixabay não exige crédito.
- Componentes: confira a licença de cada registry (shadcn/ui, React Bits, Motion Primitives e Fancy Components).
