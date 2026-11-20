# pocket-design-mcp: map

MCP server (stdio, TypeScript) that gives coding agents icons, fonts, images, components, easings, contrast checks, SVG optimization and palettes, using free sources only.

## Where things live
- `src/index.ts`: registers the 12 tools (names, descriptions, zod schemas)
- `src/sources.ts`: external calls (Iconify, Google Fonts, Fontshare, Pixabay, component registries) and svgo
- `src/motion.ts`: easings, springs and eased gradients
- `src/color.ts`: OKLCH conversion, 50–950 scale, harmonies, WCAG and APCA contrast
- `src/catalog.ts`: catalog from resources.cesaroeduardo.com and designengineer.tools, with the `access` field
- `src/http.ts`: fetch with timeout and in-memory cache
- `test/smoke.mjs`: starts the server and calls every tool
- `scripts/check-docs.mjs`: fails if a doc mentions a path, script or tool that does not exist
- `.github/workflows/ci.yml`: runs `docs:check` and `npm test` on every PR; gitleaks scans for secrets

## Commands
- `npm run build`: compiles to `dist/`
- `npm test`: build + smoke test (needs internet)
- `npm run docs:check`: checks the docs

Apache-2.0. Git and PRs: `fluxo-github` skill.

## Rules that never break
- English first everywhere (code, tool descriptions, docs, commits, PRs); Portuguese comes after (`README.pt-BR.md`, a section in the PR).
- Free sources only. A site without an open API goes in the catalog as `link`; no scraping.
- Keys only through environment variables (`PIXABAY_API_KEY`). Never in code or in the repo.
- A tool error comes back as text with `isError`; it never crashes the server.

## Not verified
- `search_images` with a real key (the test only covers the missing-key warning).
- Clients other than the test's MCP client (Cursor, Claude Desktop).

## Before X, read Y
| Before... | Read |
|---|---|
| changing or adding a tool | `src/index.ts` and `docs/decisions.md` |
| swapping a data source | `docs/decisions.md` |
| updating the catalog | `src/catalog.ts` (top comment) |
