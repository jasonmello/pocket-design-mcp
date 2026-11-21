// Smoke test: starts the server over stdio and calls every tool for real.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/index.js"], env: { ...process.env } }));

let failed = 0;
const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));
if (tools.length !== 20) { console.log(`FAIL expected 20 tools, got ${tools.length}`); failed++; }

async function check(name, args, ok) {
  const res = await client.callTool({ name, arguments: args });
  const body = res.content[0].text;
  let pass;
  try { pass = !res.isError && ok(body); } catch { pass = false; }
  if (!pass) failed++;
  console.log(`${pass ? "OK  " : "FAIL"} ${name} ${JSON.stringify(args).slice(0, 60)} → ${body.slice(0, 140).replace(/\s+/g, " ")}`);
  return body;
}

await check("list_resources", { category: "icons" }, (b) => JSON.parse(b).count === 4);
await check("list_resources", { query: "react bits" }, (b) => JSON.parse(b).items[0].access.startsWith("tool:"));
await check("search_icons", { query: "home", limit: 5 }, (b) => JSON.parse(b).icons.length === 5);
await check("search_icons", { query: "home", sets: ["feather"] }, (b) => { const i = JSON.parse(b).icons; return i.length > 0 && i.every((x) => x.startsWith("feather:")); });
await check("get_icon", { name: "ph:house", size: 24, color: "#111827" }, (b) => b.startsWith("<svg") && b.includes("#111827"));
await check("search_fonts", { query: "inter", source: "google", limit: 3 }, (b) => JSON.parse(b)[0].family === "Inter");
await check("search_fonts", { query: "satoshi", source: "fontshare" }, (b) => { const f = JSON.parse(b)[0]; return f.family === "Satoshi" && !f.weights.includes(0) && f.variable; });
await check("search_fonts", { category: "serif", source: "google", limit: 3 }, (b) => JSON.parse(b).every((f) => f.category === "Serif"));
await check("search_fonts", { category: "mono", limit: 3 }, (b) => JSON.parse(b).length > 0);
await check("search_components", { query: "dialog", registries: ["shadcn"] }, (b) => JSON.parse(b).components.some((c) => c.name === "dialog"));
await check("search_components", { query: "text" }, (b) => { const r = new Set(JSON.parse(b).components.map((c) => c.registry)); return r.size >= 2; });
await check("get_component", { name: "button" }, (b) => JSON.parse(b).files[0].content.includes("buttonVariants"));
await check("get_component", { name: "BlurText-TS-TW", registry: "reactbits" }, (b) => JSON.parse(b).install.includes("reactbits.dev/r/BlurText-TS-TW.json"));
await check("get_component", { name: "text-effect", registry: "motion-primitives" }, (b) => JSON.parse(b).files.length > 0);
await check("get_easing", { name: "easeOutCubic" }, (b) => JSON.parse(b).css === "cubic-bezier(0.33, 1, 0.68, 1)");
await check("get_easing", { name: "easeInOutQuart" }, (b) => JSON.parse(b).gsapHint === "power3.inOut");
await check("get_easing", { name: "easeOutBounce" }, (b) => JSON.parse(b).css.startsWith("linear(0,"));
await check("get_easing", { spring: { stiffness: 100, damping: 40 } }, (b) => JSON.parse(b).css.endsWith(", 1)"));
await check("easing_gradient", { from: "#000" }, (b) => JSON.parse(b).css.startsWith("linear-gradient(to bottom"));
await check("check_contrast", { text: "#000000", background: "#ffffff" }, (b) => { const r = JSON.parse(b); return r.wcag.ratio === 21 && r.apca.lc === 106; });
await check("check_contrast", { text: "#9ca3af", background: "#ffffff" }, (b) => { const r = JSON.parse(b); return !r.wcag.passes && /^#[0-9a-f]{6}$/.test(r.suggestion); });
await check("optimize_svg", { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><!-- c --><g><rect x="0.000000" y="0.0000" width="10.123456" height="10"/></g></svg>' }, (b) => JSON.parse(b).after < JSON.parse(b).before);
await check("make_palette", { base: "#3b82f6", harmony: "triadic" }, (b) => Object.keys(JSON.parse(b).scale).length === 11 && JSON.parse(b).harmony.colors.length === 3);

// Errors must come back readable, not crash the server.
const bad = await client.callTool({ name: "get_icon", arguments: { name: "nao-existe" } });
console.log(bad.isError ? "OK   error handled:" : "FAIL error not flagged:", bad.content[0].text);
if (!bad.isError) failed++;

// Images: no key needed (Wikimedia Commons); Pixabay only when a key is set.
await check("search_images", { query: "mountain lake", limit: 2 }, (b) => { const r = JSON.parse(b); return r.images.length > 0 && r.images[0].license; });
if (process.env.PIXABAY_API_KEY) {
  await check("search_images", { query: "mountain", source: "pixabay", limit: 2 }, (b) => JSON.parse(b).images.length === 2);
} else {
  const r = await client.callTool({ name: "search_images", arguments: { query: "mountain", source: "pixabay" } });
  console.log(r.isError ? "OK   pixabay warns without key:" : "FAIL", r.content[0].text.slice(0, 90));
  if (!r.isError) failed++;
}

// Icons beyond the default sets
await check("list_icon_sets", { query: "lucide" }, (b) => JSON.parse(b).sets[0].prefix === "lucide");
await check("search_icons", { query: "github", sets: ["brands"] }, (b) => JSON.parse(b).icons.includes("simple-icons:github"));
await check("search_icons", { query: "rocket", sets: ["emoji"] }, (b) => JSON.parse(b).icons.some((i) => i.startsWith("fluent-emoji-flat:")));
await check("search_icons", { query: "house", limit: 8 }, (b) => new Set(JSON.parse(b).icons.map((i) => i.split(":")[0])).size >= 3);
await check("get_icon", { name: "flag:br-4x3" }, (b) => b.startsWith("<svg"));

// Fonts: self-hosting info from Fontsource
await check("search_fonts", { query: "inter", source: "google", limit: 1 }, (b) => JSON.parse(b)[0].selfHost.install === "npm i @fontsource-variable/inter");
await check("search_fonts", { source: "fontsource", category: "display", limit: 2 }, (b) => JSON.parse(b).every((f) => f.source === "fontsource" && f.selfHost));

// Tokens
await check("type_scale", {}, (b) => { const s = JSON.parse(b).steps; return s.length === 8 && s.find((x) => x.name === "base").clamp.startsWith("clamp(1rem"); });
await check("spacing_scale", {}, (b) => JSON.parse(b).find((x) => x.name === "4").px === 16);
await check("make_shadows", { levels: 3 }, (b) => JSON.parse(b).shadows.length === 3);
await check("export_tokens", { colors: { primary: "#4f46e5" }, format: "tailwind" }, (b) => b.includes("@theme {") && b.includes("--color-primary-700: #4f46e5;") && b.includes("--spacing: 0.25rem;"));
await check("export_tokens", { colors: { primary: "#4f46e5" }, format: "dtcg" }, (b) => JSON.parse(b).color.primary["500"].$type === "color");
await check("make_palette", { base: "#4f46e5" }, (b) => Object.values(JSON.parse(b).scale).some((s) => s.hex === "#4f46e5"));

// SVG and backgrounds
await check("svg_to_react", { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M2 2h20"/></svg>', name: "LineIcon" }, (b) => { const c = JSON.parse(b).code; return c.includes("strokeWidth") && c.includes("{...props}") && c.includes("SVGProps"); });
await check("make_pattern", { type: "grid" }, (b) => JSON.parse(b).css.startsWith('background-image: url("data:image/svg+xml,'));
await check("make_blob", { seed: 3 }, (b) => JSON.parse(b).path.endsWith("Z"));
const unsafe = await client.callTool({ name: "make_pattern", arguments: { type: "dots", color: '"/><script>' } });
console.log(unsafe.isError ? "OK   unsafe pattern color rejected" : "FAIL unsafe color accepted");
if (!unsafe.isError) failed++;

// Prompts and resource
const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
const promptOk = ["design_review", "build_section", "brand_kit", "unify_icons"].every((n) => prompts.includes(n));
const kit = await client.getPrompt({ name: "brand_kit", arguments: { color: "#0ea5e9" } });
const catalog = JSON.parse((await client.readResource({ uri: "pocket-design://catalog" })).contents[0].text);
const extrasOk = promptOk && kit.messages[0].content.text.includes("#0ea5e9") && catalog.length > 100;
console.log(extrasOk ? "OK   prompts and catalog resource" : "FAIL prompts or resource");
if (!extrasOk) failed++;

await client.close();
console.log(failed ? `\n${failed} failure(s)` : "\nall ok");
process.exit(failed ? 1 : 0);
