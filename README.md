# pocket-design-mcp

**English** · [Português](README.pt-BR.md)

A free MCP server that gives your coding agent (Claude Code, Claude Desktop, Cursor...) a designer's toolbox: icons from 280 sets, fonts, images, components, design tokens, easings, contrast checks, SVG tools and background patterns. You ask ("put a Lucide house icon in the header", "make tokens from #4f46e5", "give this card a softer shadow") and the agent finds it and drops it into your code.

No API keys needed.

> Inspired by [Rei do Photoshop](https://resources.cesaroeduardo.com/).

## Install

Claude Code:

```bash
claude mcp add pocket-design --scope user -- npx -y pocket-design-mcp
```

Claude Desktop (`claude_desktop_config.json`) or Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pocket-design": { "command": "npx", "args": ["-y", "pocket-design-mcp"] }
  }
}
```

Optional: add `"env": { "PIXABAY_API_KEY": "your_key" }` to search Pixabay too (free key at https://pixabay.com/api/docs/).

## Tools

| Tool | What it does | Source |
|---|---|---|
| `search_icons` / `get_icon` | Any of Iconify's ~280 sets: Lucide, Phosphor, Tabler, Material Symbols, Heroicons, Solar... plus brand logos, emoji and flags | Iconify |
| `list_icon_sets` | Lists the sets with icon count, license and samples | Iconify |
| `svg_to_react` | Turns an SVG into a typed React component with props spread on the root | svgo, local |
| `optimize_svg` | Shrinks SVGs (the engine behind SVGOMG) | svgo, local |
| `search_fonts` | Google Fonts, Fontshare and Fontsource, with the CSS link and the npm package to self-host | Google Fonts, Fontshare, Fontsource |
| `search_images` | Freely licensed photos and illustrations, with license and attribution | Wikimedia Commons, Openverse, Pixabay (optional key) |
| `search_components` / `get_component` | Code and install command | shadcn/ui, React Bits, Motion Primitives, Fancy Components |
| `make_palette` | 50–950 scale in OKLCH (your color stays in it), harmonies and WCAG contrast | local |
| `check_contrast` | WCAG 2 ratio + APCA Lc, with a fix suggestion | local |
| `type_scale` | Fluid modular type scale as CSS `clamp()`, with line-height and tracking | local |
| `spacing_scale` | Linear or geometric spacing scale | local |
| `make_shadows` | Layered elevation shadows (xs to 2xl) | local |
| `export_tokens` | Colors + type + spacing + radius + shadows as CSS variables, Tailwind v4 `@theme` or DTCG JSON | local |
| `get_easing` | easings.net curves as CSS, Motion and GSAP; springs as CSS `linear()` | local |
| `easing_gradient` | Smooth gradients without the hard edge | local |
| `make_pattern` / `make_blob` | Seamless SVG patterns (grid, dots, waves, noise...) and organic blobs | local |
| `list_resources` | ~180 curated design resources and how to reach each one | local |

### Prompts

Clients that support MCP prompts show these in their menu:

- **design_review**: checks a screen for contrast, type scale, spacing rhythm, icon consistency and motion.
- **build_section**: builds a landing page section (hero, features, pricing...) with tokens, fonts, icons and components.
- **brand_kit**: turns one color and a mood into palette, fonts, scales, shadows and exported tokens.
- **unify_icons**: swaps every icon in a folder for one consistent set.

The catalog is also available as the resource `pocket-design://catalog`.

## Talk instead of typing (Wispr Flow style, for free)

The MCP does not record audio. Your voice becomes text before it reaches the agent:

- **macOS Dictation:** System Settings > Keyboard > Dictation. Then press the shortcut (default: Fn twice) in any text field.
- **VoiceInk:** an open-source Mac app that runs Whisper locally, closer to the Wispr Flow experience.

## Develop

```bash
npm install
```

```bash
npm test
```

The test starts the server and calls every tool for real, so it needs internet.

## License

Code under [Apache-2.0](LICENSE). You can use, modify and redistribute it, including in commercial and closed-source projects, as long as you keep the license and copyright notices and state your changes. It also grants a patent license from contributors.

The resources this MCP fetches have their own licenses:

- Icons: each set's license is in `list_icon_sets` (most are MIT, Apache or ISC; brand logos belong to their owners).
- Fonts: open licenses (OFL and similar); Fontshare uses the ITF Free Font License. Read them before shipping.
- Images: Wikimedia Commons and Openverse results carry their own Creative Commons license; show the attribution when it is required. Pixabay needs no attribution.
- Components: check each registry's license (shadcn/ui, React Bits, Motion Primitives and Fancy Components).
