# pocket-design-mcp

[English](README.md) · **Português**

MCP grátis que dá ao seu agente de código (Claude Code, Cursor, etc.) acesso direto a ícones, fontes, imagens, componentes, easings, checagem de contraste, otimização de SVG e paletas. Você pede ("coloca um ícone de casa do Phosphor no header", "acha uma fonte display parecida com a Satoshi", "deixa esse fade com cara de mola") e o agente busca e já aplica no código.

> Inspirado no [Rei do Photoshop](https://resources.cesaroeduardo.com/).

## Ferramentas

| Ferramenta | O que faz | Fonte | Precisa de chave? |
|---|---|---|---|
| `list_resources` | Lista ~180 recursos de design selecionados e como chegar em cada um | local | não |
| `search_icons` / `get_icon` | Busca e devolve SVG de Phosphor, Hugeicons, Feather e Pixelarticons | Iconify | não |
| `search_fonts` | Busca fontes e devolve o link do CSS | Google Fonts + Fontshare | não |
| `search_images` | Fotos, ilustrações e vetores | Pixabay | sim, grátis |
| `search_components` / `get_component` | Código e comando de instalação | shadcn/ui, React Bits, Motion Primitives, Fancy Components | não |
| `get_easing` | Curvas do easings.net em CSS, Motion e GSAP; molas em CSS `linear()` | local | não |
| `easing_gradient` | Gradientes suaves, sem a faixa dura | local | não |
| `check_contrast` | Razão WCAG 2 + Lc do APCA, com sugestão de correção | local | não |
| `optimize_svg` | Enxuga SVG (motor do SVGOMG) | svgo, local | não |
| `make_palette` | Escala 50–950 em OKLCH, harmonias e contraste WCAG | local | não |

Os recursos sem API grátis (Mobbin, Awwwards, Godly...) aparecem no `list_resources` só como link. Os que têm MCP oficial (Figma, ElevenLabs, Supabase, Vercel, Notion, Linear, PostHog, 21st.dev) vêm marcados com `mcp`: instale o MCP deles junto com este.

## Instalar

```bash
npm install
```

```bash
npm run build
```

Registrar no Claude Code (troque o caminho pelo seu):

```bash
claude mcp add pocket-design --scope user -- node /CAMINHO/pocket-design-mcp/dist/index.js
```

Com imagens da Pixabay (crie a chave grátis em https://pixabay.com/api/docs/):

```bash
claude mcp add pocket-design --scope user -e PIXABAY_API_KEY=sua_chave -- node /CAMINHO/pocket-design-mcp/dist/index.js
```

Reinicie a sessão e confira com `/mcp`.

## Falar em vez de digitar (tipo Wispr Flow, de graça)

O MCP não grava áudio. A voz vira texto antes de chegar no agente:

- **Ditado do macOS:** Ajustes do Sistema > Teclado > Ditado. Depois é só apertar o atalho (padrão: Fn duas vezes) em qualquer campo de texto, inclusive o do Claude.
- **VoiceInk:** app open source que roda o Whisper local no Mac, mais parecido com o Wispr Flow.

Fluxo: você fala → o texto cai no Claude Code → o agente chama o `pocket-design` → o ícone, a fonte ou o componente entra no código.

## Testar

```bash
npm test
```

Sobe o servidor e chama cada ferramenta de verdade, então precisa de internet. Sem `PIXABAY_API_KEY`, o teste só confere se a busca de imagens avisa que falta a chave.

## Licença

Código sob [Apache-2.0](LICENSE). Pode usar, modificar e redistribuir, inclusive em projetos comerciais e de código fechado, desde que mantenha os avisos de licença e de copyright e indique o que mudou. A licença também concede o uso das patentes dos contribuidores.

Os recursos que o MCP busca têm licenças próprias:

- Ícones: MIT (Phosphor, Hugeicons, Feather e Pixelarticons, conforme o Iconify).
- Google Fonts: licenças abertas. Fontshare: ITF Free Font License, grátis inclusive para uso comercial; vale ler antes de usar.
- Pixabay: uso grátis, sem atribuição obrigatória. Baixe e hospede as imagens você mesmo.
- Componentes: confira a licença de cada registry (shadcn/ui, React Bits, Motion Primitives e Fancy Components).
