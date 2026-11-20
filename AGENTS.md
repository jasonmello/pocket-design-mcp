# pocket-design-mcp: mapa

Servidor MCP (stdio, TypeScript) que dá a agentes de código ícones, fontes, imagens, componentes shadcn/ui, otimização de SVG e paletas, usando só fontes grátis.

## Onde está cada coisa
- `src/index.ts`: registro das 9 ferramentas (nomes, descrições, schemas zod)
- `src/sources.ts`: chamadas externas (Iconify, Google Fonts, Fontshare, Pixabay, shadcn) e svgo
- `src/color.ts`: conversão OKLCH, escala 50–950, harmonias, contraste WCAG
- `src/catalog.ts`: catálogo copiado de resources.cesaroeduardo.com, com o campo `access`
- `src/http.ts`: fetch com timeout e cache em memória
- `test/smoke.mjs`: sobe o servidor e chama cada ferramenta
- `scripts/check-docs.mjs`: falha se um doc citar caminho, script ou ferramenta que não existe
- `.github/workflows/ci.yml`: roda `docs:check` e `npm test` em todo PR; gitleaks procura segredos

## Comandos
- `npm run build`: compila para `dist/`
- `npm test`: build + teste de fumaça (precisa de internet)
- `npm run docs:check`: confere os docs

Licença AGPL-3.0. Git e PR: skill `fluxo-github`.

## Regras que não se quebram
- Só fontes grátis. Site sem API aberta entra no catálogo como `link`; nada de scraping.
- Chave só por variável de ambiente (`PIXABAY_API_KEY`). Nunca no código nem no repositório.
- Erro de ferramenta volta como texto com `isError`, nunca derruba o servidor.

## Não verificado
- `search_images` com chave real (o teste só cobre o aviso de chave ausente).
- Uso no Cursor e em outros clientes além do cliente MCP do teste.

## Antes de X, leia Y
| Antes de... | Leia |
|---|---|
| mudar ou criar ferramenta | `src/index.ts` e `docs/decisoes.md` |
| trocar uma fonte de dados | `docs/decisoes.md` |
| atualizar o catálogo | `src/catalog.ts` (comentário do topo) |
