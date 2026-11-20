// Fails if a doc mentions a path, npm script or MCP tool that no longer exists.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const docs = ["AGENTS.md", "README.md", "README.pt-BR.md", ...readdirSync("docs").map((f) => `docs/${f}`)];
const scripts = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).scripts);
const index = readFileSync("src/index.ts", "utf8");
const tools = [...index.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);

const errors = [];
for (const doc of docs) {
  const text = readFileSync(doc, "utf8");
  // Project paths in backticks, e.g. `src/index.ts`
  for (const [, path] of text.matchAll(/`((?:src|test|docs|scripts|\.github)\/[^`\s]+)`/g)) {
    if (!existsSync(path)) errors.push(`${doc}: missing path ${path}`);
  }
  // npm scripts, e.g. npm run build, npm test
  for (const [, name] of text.matchAll(/npm (?:run )?([a-z:]+)/g)) {
    if (["install", "ci", "i"].includes(name)) continue;
    if (!scripts.includes(name)) errors.push(`${doc}: missing npm script "${name}"`);
  }
  // MCP tools in backticks with a known snake_case prefix
  for (const [, name] of text.matchAll(/`((?:list|search|get|optimize|make|check|easing)_[a-z_]+)`/g)) {
    if (!tools.includes(name)) errors.push(`${doc}: unknown tool ${name}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`docs ok (${docs.length} files, ${tools.length} tools)`);
