# pocket-design-mcp

**English** · [Português](README.pt-BR.md)

A free MCP server that gives your coding agent (Claude Code, Cursor, etc.) direct access to icons, fonts, images, components, easings, contrast checks, SVG optimization and color palettes. You ask ("put a Phosphor house icon in the header", "find a display font like Satoshi", "make this fade feel springy") and the agent finds it and drops it into your code.

> Inspired by [Rei do Photoshop](https://resources.cesaroeduardo.com/).

## Tools

| Tool | What it does | Source | Key needed? |
|---|---|---|---|
| `list_resources` | Lists ~180 curated design resources and how to reach each one | local | no |
| `search_icons` / `get_icon` | Searches and returns SVGs from Phosphor, Hugeicons, Feather and Pixelarticons | Iconify | no |
| `search_fonts` | Finds fonts and returns the CSS link | Google Fonts + Fontshare | no |
| `search_images` | Photos, illustrations and vectors | Pixabay | yes, free |
| `search_components` / `get_component` | Code and install command | shadcn/ui, React Bits, Motion Primitives, Fancy Components | no |
| `get_easing` | easings.net curves as CSS, Motion and GSAP; springs as CSS `linear()` | local | no |
| `easing_gradient` | Smooth gradients without the hard edge | local | no |
| `check_contrast` | WCAG 2 ratio + APCA Lc, with a fix suggestion | local | no |
| `optimize_svg` | Shrinks SVGs (the engine behind SVGOMG) | svgo, local | no |
| `make_palette` | 50–950 scale in OKLCH, harmonies and WCAG contrast | local | no |

Resources without a free API (Mobbin, Awwwards, Godly...) show up in `list_resources` as links only. Those with an official MCP (Figma, ElevenLabs, Supabase, Vercel, Notion, Linear, PostHog, 21st.dev) are marked `mcp`: install theirs alongside this one.

## Install

```bash
npm install
```

```bash
npm run build
```

Register it in Claude Code (replace the path with yours):

```bash
claude mcp add pocket-design --scope user -- node /PATH/pocket-design-mcp/dist/index.js
```

With Pixabay images (get a free key at https://pixabay.com/api/docs/):

```bash
claude mcp add pocket-design --scope user -e PIXABAY_API_KEY=your_key -- node /PATH/pocket-design-mcp/dist/index.js
```

Restart the session and check with `/mcp`.

## Talk instead of typing (Wispr Flow style, for free)

The MCP does not record audio. Your voice becomes text before it reaches the agent:

- **macOS Dictation:** System Settings > Keyboard > Dictation. Then press the shortcut (default: Fn twice) in any text field, including Claude's.
- **VoiceInk:** an open-source Mac app that runs Whisper locally, closer to the Wispr Flow experience.

Flow: you speak → the text lands in Claude Code → the agent calls `pocket-design` → the icon, font or component ends up in your code.

## Test

```bash
npm test
```

It starts the server and calls every tool for real, so it needs internet. Without `PIXABAY_API_KEY`, it only checks that the image search warns about the missing key.

## License

Code under [Apache-2.0](LICENSE). You can use, modify and redistribute it, including in commercial and closed-source projects, as long as you keep the license and copyright notices and state your changes. It also grants a patent license from contributors.

The resources this MCP fetches have their own licenses:

- Icons: MIT (Phosphor, Hugeicons, Feather and Pixelarticons, as listed on Iconify).
- Google Fonts: open licenses. Fontshare: ITF Free Font License, free for commercial use too; read it before shipping.
- Pixabay: free to use, no attribution required. Download and host images yourself.
- Components: check each registry's license (shadcn/ui, React Bits, Motion Primitives and Fancy Components).
