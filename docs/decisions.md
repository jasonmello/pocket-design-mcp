# Decisions

## 2026-11-20

- **Name `pocket-design-mcp`**, picked by Jason.
- **English first.** Code, tool descriptions, docs, commits and PRs are written in English; Portuguese comes after (`README.pt-BR.md`). Jason's call, so the repo reads well to anyone.
- **Apache-2.0**, picked by Jason (replaced AGPL-3.0 the same day): permissive, so anyone can use it in commercial or closed projects, with an explicit patent grant.
- **Icons through Iconify** instead of each set's own API: one keyless API covers Phosphor (`ph`), Hugeicons, Feather and Pixelarticons.
- **Feather searched from its set list**: Feather (`feather`, Cole Bemis) is on Iconify, but its search returns 0 results. We download the name list (`/collection?prefix=feather`) and filter locally. Not to be confused with `fe` (Feather Icon, by another author).
- **Google Fonts through `fonts.google.com/metadata/fonts`**, so no key is needed. It is public but undocumented; if it breaks, switch to the Web Fonts API with a free key.
- **Fontshare** only filters by text (`q`), and `offset` does not page past the first 100, so a category search without text only sees those 100. Variable styles come with weight 0; they are dropped from `weights` and set `variable: true`.
- **Components from four shadcn-format registries** (shadcn/ui `new-york-v4`, React Bits, Motion Primitives, Fancy Components): they share one schema, so one reader covers all of them. From React Bits we only list the TS + Tailwind variant (`-TS-TW`), since it ships four per component. `get_component` returns the code and the `npx shadcn@latest add` command but never runs it: the agent decides where to install.
- **21st.dev left out of `search_components`**: it has no public registry index; it is marked `mcp` because it has its own MCP.
- **Easings computed locally** with the easings.net values. Elastic and bounce do not fit a `cubic-bezier`, so they become CSS `linear()` with 50 samples. Springs use the damped harmonic oscillator; duration is when it stays within ±0.1% of the target.
- **Eased gradients with `color-mix()` in OKLab**, so they work with any CSS color, `transparent` included. Requires Chrome 111+, Safari 16.2+, Firefox 113+.
- **Contrast with WCAG 2 and APCA (0.0.98G-4g).** WCAG is still the legal standard; APCA reads better on dark themes. The fix suggestion moves OKLCH lightness while keeping the hue.
- **Palettes computed in OKLCH locally** instead of Coolors (no public API). The scale follows Tailwind v4 lightness; for `#3b82f6` step 500 comes out `#4387f7`, close to the original.
- **No scraping** of Mobbin, Awwwards, 60fps, Godly and similar: it would break their terms and be fragile to maintain. They are listed as `link`.
- **Voice stays outside the MCP**: an MCP cannot capture audio. macOS Dictation or VoiceInk (local Whisper) turns speech into text.
- **CI calls the real APIs** in the smoke test. If an external API goes down, CI turns red without any code change; rerun it before digging in.
