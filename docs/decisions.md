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

## 2026-11-21

- **GitHub Actions major versions are accepted when CI passes.** The general rule closes major bumps, but for Actions they mostly change the runtime (e.g. Node 24) and staying behind ends in deprecation warnings. Jason approved merging checkout v7, setup-node v7 and gitleaks v3.
- **All Iconify sets are open** (~280), with aliases (`brands` = simple-icons, `emoji` = fluent-emoji-flat, `flags` = flag...). Default search covers popular UI sets and interleaves results by set so several styles show up. Sets hidden from Iconify's search index (Feather, Fluent Emoji...) are searched from their name list.
- **Images work with no key.** `auto` uses Wikimedia Commons first (fast, free licenses only) and Openverse as fallback. Openverse was tested on 2026-11-21: 5–33 s per request and some 500/504 errors, and its server-side filters made it slower, so we fetch 20 results with only the query and filter license, type and orientation locally. Pixabay is used when `PIXABAY_API_KEY` is set.
- **Fontsource enriches font results**: Google fonts get a `selfHost` block (npm package + import), and Fontsource's non-Google fonts show up as their own results. If Fontsource is down, the other sources still answer.
- **The brand color stays in its own scale**: `make_palette` and `export_tokens` replace the step with the closest lightness by the exact input color.
- **Type scale follows the Utopia approach** (fluid `clamp()` between two viewports, two ratios). Tailwind v4 export uses its own variable names (`--text-*`, `--text-*--line-height`, a single `--spacing`).
- **Shadows are layered** (each elevation stacks layers whose offset and blur double), following the common "realistic shadows" technique.
- **svg_to_react rejects scripts and event handlers** instead of trying to sanitize them, and spreads props on the root `<svg>`.
- **Prompts and a catalog resource** were added so clients with prompt menus can run whole workflows (review, build a section, brand kit, unify icons).
- **npm package** `pocket-design-mcp` (name was free on 2026-11-21) so installing is one `npx` line. Publishing needs Jason's npm login.
- **Releases are automated** (`.github/workflows/release.yml`). Merging a PR that bumps `version` makes CI test, publish to npm and create the tag plus a GitHub Release with notes generated from PR titles. npm auth uses **trusted publishing** (OIDC, needs npm 11.5.1+): no npm token exists to leak, no 2FA prompt per release, and provenance is attached automatically. The publish step skips versions already on npm, so rerunning a half-failed release is safe. The release job does not use the dependency cache. Jason configured the trusted publisher on npmjs.com once.
- **The server version is read from `package.json`** instead of being typed in `src/index.ts`, so it can never drift from the published version.
- **v0.3.0 was published by hand** (before the workflow existed); its tag and Release were created manually on the published commit.
