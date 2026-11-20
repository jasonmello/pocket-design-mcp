# pocket-design-mcp

MCP grátis que dá ao seu agente de código (Claude Code, Cursor, etc.) acesso direto a ícones, fontes, imagens, componentes shadcn/ui, otimização de SVG e geração de paletas. Você pede ("coloca um ícone de casa do Phosphor no header", "acha uma fonte display parecida com a Satoshi") e o agente busca e já aplica no código.

> Inspired by [resources.cesaroeduardo.com](https://resources.cesaroeduardo.com/).

## Ferramentas

| Ferramenta | O que faz | Fonte | Precisa de chave? |
|---|---|---|---|
| `list_resources` | Lista os ~70 recursos do catálogo e diz como chegar em cada um | local | não |
| `search_icons` / `get_icon` | Busca e devolve SVG de Phosphor, Hugeicons, Feather e Pixelarticons | Iconify | não |
| `search_fonts` | Busca fontes e devolve o link do CSS | Google Fonts + Fontshare | não |
| `search_images` | Fotos, ilustrações e vetores | Pixabay | sim, grátis |
| `search_components` / `get_component` | Código e comando de instalação | registry do shadcn/ui | não |
| `optimize_svg` | Enxuga SVG (motor do SVGOMG) | svgo, local | não |
| `make_palette` | Escala 50–950 em OKLCH, harmonias e contraste WCAG | local | não |

Os recursos sem API grátis (Mobbin, Awwwards, MJ Pro...) aparecem no `list_resources` só como link. Os que têm MCP oficial (Figma, ElevenLabs, Supabase, Vercel, Notion, Linear, PostHog, 21st.dev) vêm marcados com `mcp`: instale o MCP deles junto com este.

## Instalar

```bash
npm install
```

```bash
npm run build
```

Registrar no Claude Code (troque o caminho pelo da sua pasta):

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

Código sob [AGPL-3.0](LICENSE). Pode usar, modificar e redistribuir. Se você oferecer uma versão modificada como serviço na rede, precisa disponibilizar o código dela sob a mesma licença.

Os recursos que o MCP busca têm licenças próprias:

- Ícones: MIT (Phosphor, Hugeicons, Feather e Pixelarticons, conforme o Iconify).
- Google Fonts: licenças abertas. Fontshare: licença própria da ITF (Free Font License), grátis inclusive para uso comercial; vale ler antes de usar.
- Pixabay: uso grátis, sem atribuição obrigatória. Baixe e hospede as imagens você mesmo.
