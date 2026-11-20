// Smoke test: starts the server over stdio and calls every tool for real.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: ["dist/index.js"], env: { ...process.env } }));

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

let failed = 0;
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

if (process.env.PIXABAY_API_KEY) {
  await check("search_images", { query: "mountain", limit: 2 }, (b) => JSON.parse(b).images.length === 2);
} else {
  const r = await client.callTool({ name: "search_images", arguments: { query: "mountain" } });
  console.log(r.isError ? "OK   search_images warns without key:" : "FAIL", r.content[0].text.slice(0, 90));
  if (!r.isError) failed++;
}

await client.close();
console.log(failed ? `\n${failed} failure(s)` : "\nall ok");
process.exit(failed ? 1 : 0);
