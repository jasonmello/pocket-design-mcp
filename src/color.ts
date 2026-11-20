// hex <-> OKLCH conversion (Björn Ottosson) to build palettes locally, no API.

export interface Oklch {
  l: number; // 0..1
  c: number; // ~0..0.4
  h: number; // graus
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

export function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid color: "${hex}". Use hex, e.g. #3b82f6`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = parseHex(hex).map(toLinear);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: (h + 360) % 360 };
}

function oklchToRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** Converts to hex; if the color is outside sRGB, lowers chroma until it fits. */
export function oklchToHex(color: Oklch): string {
  let c = color.c;
  let rgb = oklchToRgb({ ...color, c });
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.002);
    rgb = oklchToRgb({ ...color, c });
  }
  return (
    "#" +
    rgb
      .map((v) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** WCAG contrast ratio between two hex colors. */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = parseHex(hex).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// OKLCH lightness per step (close to the Tailwind v4 scale).
const SHADE_L: Record<string, number> = {
  "50": 0.97, "100": 0.936, "200": 0.885, "300": 0.808, "400": 0.711,
  "500": 0.637, "600": 0.555, "700": 0.479, "800": 0.409, "900": 0.355, "950": 0.262,
};

export function shades(base: string): Record<string, string> {
  const { c, h } = hexToOklch(base);
  const out: Record<string, string> = {};
  for (const [step, l] of Object.entries(SHADE_L)) {
    // less chroma at the ends, like real scales
    const taper = 1 - Math.abs(l - 0.6) * 0.9;
    out[step] = oklchToHex({ l, c: c * Math.max(0.15, taper), h });
  }
  return out;
}

export type Harmony = "complementary" | "analogous" | "triadic" | "split-complementary" | "tetradic";

const OFFSETS: Record<Harmony, number[]> = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  "split-complementary": [0, 150, 210],
  tetradic: [0, 90, 180, 270],
};

export function harmony(base: string, kind: Harmony): string[] {
  const o = hexToOklch(base);
  return OFFSETS[kind].map((d) => oklchToHex({ ...o, h: (o.h + d + 360) % 360 }));
}

/** APCA (0.0.98G-4g). Positive Lc = dark text on light background; negative = the opposite. */
export function apca(text: string, bg: string): number {
  const y = (hex: string) => {
    const [r, g, b] = parseHex(hex);
    let v = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
    if (v < 0.022) v += (0.022 - v) ** 1.414;
    return v;
  };
  const yt = y(text);
  const yb = y(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let out: number;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    out = s < 0.1 ? 0 : s - 0.027;
  } else {
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
    out = s > -0.1 ? 0 : s + 0.027;
  }
  return +(out * 100).toFixed(1);
}

/** Finds the closest text color (same hue) that reaches the requested WCAG ratio. */
export function fixContrast(text: string, bg: string, target: number): string | null {
  const o = hexToOklch(text);
  for (let d = 0.005; d <= 1; d += 0.005) {
    for (const l of [o.l - d, o.l + d]) {
      if (l < 0 || l > 1) continue;
      const hex = oklchToHex({ ...o, l });
      if (contrast(hex, bg) >= target) return hex;
    }
  }
  return null;
}
