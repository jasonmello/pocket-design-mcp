// SVG helpers: optimization (svgo, the engine behind SVGOMG) and conversion to a React component.
import { optimize } from "svgo";

export function optimizeSvg(svg: string, precision: number) {
  const out = optimize(svg, {
    multipass: true,
    floatPrecision: precision,
    plugins: ["preset-default", "removeDimensions"],
  });
  return { svg: out.data, before: Buffer.byteLength(svg), after: Buffer.byteLength(out.data) };
}

// Attributes JSX keeps as-is: data-*, aria-*, and ones that are already camelCase.
const KEEP = /^(data-|aria-)/;
const SPECIAL: Record<string, string> = {
  class: "className",
  "xlink:href": "xlinkHref",
  "xml:space": "xmlSpace",
  "xml:lang": "xmlLang",
  "xmlns:xlink": "xmlnsXlink",
  for: "htmlFor",
};

const camel = (name: string) => SPECIAL[name] ?? (KEEP.test(name) ? name : name.replace(/[-:]([a-z])/g, (_, ch: string) => ch.toUpperCase()));

function styleToObject(style: string) {
  const entries = style
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(":");
      const key = d.slice(0, i).trim().replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
      return `${key}: ${JSON.stringify(d.slice(i + 1).trim())}`;
    });
  return `{{ ${entries.join(", ")} }}`;
}

export function svgToReact(svg: string, opts: { name: string; typescript: boolean; optimize: boolean }) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(opts.name)) throw new Error(`Component name must be PascalCase, e.g. HeartIcon (got "${opts.name}").`);
  let src = opts.optimize ? optimizeSvg(svg, 3).svg : svg;
  src = src.replace(/<\?xml[^>]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!/^<svg[\s>]/.test(src)) throw new Error("Input must be a single <svg> element.");
  if (/<script[\s>]/i.test(src) || /\son[a-z]+\s*=/i.test(src)) throw new Error("SVG contains scripts or event handlers; remove them first.");

  // Rewrite attribute names (and style strings) inside every tag.
  const jsx = src.replace(/<([a-zA-Z][\w:-]*)(\s[^>]*?)?(\/?)>/g, (_m, tag: string, attrs: string | undefined, selfClose: string) => {
    const converted = (attrs ?? "").replace(/([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g, (_a, name: string, _q, dq, sq) => {
      const value = dq ?? sq ?? "";
      return name === "style" ? `style=${styleToObject(value)}` : `${camel(name)}=${JSON.stringify(value)}`;
    });
    return `<${tag}${converted}${selfClose}>`;
  });
  // Spread props on the root so callers can set size, color, className, aria-label...
  const withProps = jsx.replace(/^<svg([^>]*)>/, "<svg$1 {...props}>");

  const code = opts.typescript
    ? `import type { SVGProps } from "react";\n\nexport function ${opts.name}(props: SVGProps<SVGSVGElement>) {\n  return (\n    ${withProps}\n  );\n}\n`
    : `export function ${opts.name}(props) {\n  return (\n    ${withProps}\n  );\n}\n`;
  return { fileName: `${opts.name}.${opts.typescript ? "tsx" : "jsx"}`, code };
}
