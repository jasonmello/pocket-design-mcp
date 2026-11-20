# Decisões

## 2026-11-20

- **Nome `pocket-design-mcp`**, escolhido pelo Jason.
- **Ícones pelo Iconify** em vez das APIs de cada set: uma API só, sem chave, cobre Phosphor (`ph`), Hugeicons, Feather e Pixelarticons.
- **Feather buscado na lista do set**: o Feather (`feather`, Cole Bemis) existe no Iconify, mas a busca dele devolve 0 resultados. Baixamos a lista de nomes (`/collection?prefix=feather`) e filtramos aqui. Não confundir com `fe` (Feather Icon, de outra autora).
- **Google Fonts pelo `fonts.google.com/metadata/fonts`**, para não exigir chave. É um endpoint público, mas não documentado; se quebrar, trocar pela Web Fonts API com chave grátis.
- **Fontshare**: a API só filtra por texto (`q`) e o `offset` não pagina além dos 100 primeiros, então a busca por categoria sem texto olha só esses 100. Estilos variáveis vêm com peso 0; ficam fora de `weights` e marcam `variable: true`.
- **shadcn pelo registry público** (`ui.shadcn.com/r`, estilo `new-york-v4`). O `get_component` devolve o código e o comando `npx shadcn@latest add`, mas não roda o comando sozinho: quem decide instalar é o agente, no projeto certo.
- **Paletas calculadas em OKLCH, localmente**, em vez do Coolors (sem API pública). A escala imita a luminosidade do Tailwind v4; para `#3b82f6`, o degrau 500 sai `#4387f7`, perto do original.
- **Sem scraping** de Mobbin, Awwwards, 60fps e similares: viraria quebra de termos e manutenção frágil. Entram como `link`.
- **Voz fora do MCP**: um MCP não captura áudio. Quem transforma voz em texto é o ditado do macOS ou o VoiceInk (Whisper local).
- **Licença AGPL-3.0**, escolhida pelo Jason: quem rodar uma versão modificada como serviço precisa abrir o código.
- **CI chama as APIs de verdade** no teste de fumaça. Se uma API externa cair, o CI fica vermelho mesmo sem mudança no código; nesse caso, rode de novo antes de investigar.
