// Background patterns and blobs as SVG, generated locally. Each comes back as SVG and as a CSS background.

export const PATTERNS = ["grid", "dots", "diagonal", "cross", "checker", "waves", "noise"] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface PatternOptions {
  type: Pattern;
  color: string;
  background?: string;
  size: number;
  stroke: number;
  opacity: number;
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|hsl|oklch)a?\([^)<>"]*\))$/;
function safeColor(c: string) {
  // The color ends up inside SVG markup, so only plain color syntaxes are accepted.
  if (!COLOR.test(c.trim())) throw new Error(`Invalid color "${c}". Use hex, a color name, rgb(), hsl() or oklch().`);
  return c.trim();
}

export function makePattern(o: PatternOptions) {
  const color = safeColor(o.color);
  const bg = o.background ? safeColor(o.background) : undefined;
  const s = o.size;
  const w = o.stroke;
  const a = o.opacity;
  let body: string;
  let tile = s;

  switch (o.type) {
    case "grid":
      body = `<path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${a}"/>`;
      break;
    case "dots":
      body = `<circle cx="${s / 2}" cy="${s / 2}" r="${w}" fill="${color}" fill-opacity="${a}"/>`;
      break;
    case "diagonal":
      body = `<path d="M -1 1 L 1 -1 M 0 ${s} L ${s} 0 M ${s - 1} ${s + 1} L ${s + 1} ${s - 1}" stroke="${color}" stroke-width="${w}" stroke-opacity="${a}"/>`;
      break;
    case "cross": {
      const c = s / 2;
      const arm = s / 6;
      body = `<path d="M ${c - arm} ${c} H ${c + arm} M ${c} ${c - arm} V ${c + arm}" stroke="${color}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="round"/>`;
      break;
    }
    case "checker":
      tile = s * 2;
      body = `<rect width="${s}" height="${s}" fill="${color}" fill-opacity="${a}"/><rect x="${s}" y="${s}" width="${s}" height="${s}" fill="${color}" fill-opacity="${a}"/>`;
      break;
    case "waves":
      tile = s * 2;
      body = `<path d="M 0 ${s} Q ${s / 2} ${s / 2} ${s} ${s} T ${s * 2} ${s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${a}"/>`;
      break;
    case "noise":
      tile = Math.max(s, 100);
      body = `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="${a}"/>`;
      break;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">` +
    (bg ? `<rect width="100%" height="100%" fill="${bg}"/>` : "") +
    body +
    `</svg>`;
  return {
    svg,
    css: `background-image: url("data:image/svg+xml,${encodeSvg(svg)}");\nbackground-size: ${tile}px ${tile}px;`,
    note: o.type === "noise" ? "Noise is grayscale; layer it over a color with mix-blend-mode: overlay or soft-light." : undefined,
  };
}

/** Encodes SVG for a CSS data URI (lighter than base64). */
export function encodeSvg(svg: string) {
  return svg
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
}

// ---------- Blob ----------

/** Small seeded PRNG (mulberry32), so the same seed always gives the same blob. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBlob(opts: { seed: number; points: number; randomness: number; size: number; color: string }) {
  const color = safeColor(opts.color);
  const rand = rng(opts.seed);
  const c = opts.size / 2;
  const pts = Array.from({ length: opts.points }, (_, i) => {
    const angle = (i / opts.points) * Math.PI * 2;
    const r = c * (1 - opts.randomness * 0.5 + rand() * opts.randomness * 0.5) * 0.9;
    return [c + Math.cos(angle) * r, c + Math.sin(angle) * r];
  });
  // Closed Catmull-Rom spline converted to cubic Béziers for a smooth outline.
  const n = pts.length;
  const f = (v: number) => +v.toFixed(2);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])}, ${f(c2[0])} ${f(c2[1])}, ${f(p2[0])} ${f(p2[1])}`;
  }
  d += " Z";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.size} ${opts.size}"><path d="${d}" fill="${color}"/></svg>`;
  return { svg, path: d, seed: opts.seed };
}
