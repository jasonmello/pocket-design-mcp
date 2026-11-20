// Falha se algum doc citar caminho, script npm ou ferramenta MCP que não existe mais.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const docs = ["AGENTS.md", "README.md", ...readdirSync("docs").map((f) => `docs/${f}`)];
const scripts = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).scripts);
const index = readFileSync("src/index.ts", "utf8");
const tools = [...index.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);

const errors = [];
for (const doc of docs) {
  const text = readFileSync(doc, "utf8");
  // Caminhos do projeto entre crases, ex.: `src/index.ts`
  for (const [, path] of text.matchAll(/`((?:src|test|docs|scripts|\.github)\/[^`\s]+)`/g)) {
    if (!existsSync(path)) errors.push(`${doc}: caminho inexistente ${path}`);
  }
  // Scripts npm, ex.: npm run build, npm test
  for (const [, name] of text.matchAll(/npm (?:run )?([a-z:]+)/g)) {
    if (["install", "ci", "i"].includes(name)) continue;
    if (!scripts.includes(name)) errors.push(`${doc}: script npm inexistente "${name}"`);
  }
  // Ferramentas MCP citadas entre crases com nome snake_case conhecido
  for (const [, name] of text.matchAll(/`((?:list|search|get|optimize|make)_[a-z_]+)`/g)) {
    if (!tools.includes(name)) errors.push(`${doc}: ferramenta inexistente ${name}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`docs ok (${docs.length} arquivos, ${tools.length} ferramentas)`);
