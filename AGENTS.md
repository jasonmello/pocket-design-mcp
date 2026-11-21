# pocket-design-mcp: map

MCP server (stdio, TypeScript) that gives coding agents icons, fonts, images, components, design tokens, easings, contrast checks, SVG tools and patterns, using free sources only. Published to npm as `pocket-design-mcp`.

## Where things live
- `src/index.ts`: registers the 20 tools, the catalog resource and the prompts
- `src/sources.ts`: external calls (Iconify, Google Fonts, Fontshare, Fontsource, Wikimedia Commons, Openverse, Pixabay, component registries)
- `src/tokens.ts`: type scale, spacing, shadows and token export (CSS, Tailwind v4, DTCG)
- `src/color.ts`: OKLCH conversion, 50–950 scale, harmonies, WCAG and APCA contrast
- `src/motion.ts`: easings, springs and eased gradients
- `src/svg.ts`: svgo optimization and SVG → React
- `src/patterns.ts`: SVG background patterns and blobs
- `src/prompts.ts`: the MCP prompts (design_review, build_section, brand_kit, unify_icons)
- `src/catalog.ts`: catalog from resources.cesaroeduardo.com and designengineer.tools, with the `access` field
- `src/http.ts`: fetch with timeout and in-memory cache
- `test/smoke.mjs`: starts the server and calls every tool, prompt and resource
- `scripts/check-docs.mjs`: fails if a doc mentions a path, script or tool that does not exist
- `.github/workflows/ci.yml`: runs `docs:check` and `npm test` on every PR; gitleaks scans for secrets
- `.github/workflows/release.yml`: on main, if the `package.json` version has no tag yet, tests, publishes to npm (trusted publishing, no token) and creates the tag and GitHub Release

## Commands
- `npm run build`: compiles to `dist/`
- `npm test`: build + smoke test (needs internet)
- `npm run docs:check`: checks the docs
- Release: bump `version` in `package.json` inside a PR; merging it releases automatically. Never run `npm publish` by hand.

Apache-2.0. Git and PRs: `fluxo-github` skill.

## Rules that never break
- English first everywhere (code, tool descriptions, docs, commits, PRs); Portuguese comes after (`README.pt-BR.md`, a section in the PR).
- Free sources only, and no key required for the defaults. A site without an open API goes in the catalog as `link`; no scraping.
- Keys only through environment variables (`PIXABAY_API_KEY`). Never in code or in the repo.
- A tool error comes back as text with `isError`; it never crashes the server.
- Anything interpolated into SVG markup is validated first (see `safeColor` in `src/patterns.ts`).

## Not verified
- Pixabay with a real key (the test only covers the missing-key warning).
- Clients other than the test's MCP client (Cursor, Claude Desktop).

## Before X, read Y
| Before... | Read |
|---|---|
| changing or adding a tool | `src/index.ts` and `docs/decisions.md` |
| swapping a data source | `docs/decisions.md` |
| updating the catalog | `src/catalog.ts` (top comment) |
