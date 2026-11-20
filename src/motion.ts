// Easings and eased gradients, computed locally.
// Curves from https://easings.net (Andrey Sitnik and Ivan Solovev); gradients in the spirit of
// https://larsenwork.com/easing-gradients/.

type Fn = (t: number) => number;

// Curves that fit a cubic-bezier, with easings.net values.
const BEZIER: Record<string, [number, number, number, number]> = {
  easeInSine: [0.12, 0, 0.39, 0],
  easeOutSine: [0.61, 1, 0.88, 1],
  easeInOutSine: [0.37, 0, 0.63, 1],
  easeInQuad: [0.11, 0, 0.5, 0],
  easeOutQuad: [0.5, 1, 0.89, 1],
  easeInOutQuad: [0.45, 0, 0.55, 1],
  easeInCubic: [0.32, 0, 0.67, 0],
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeInQuart: [0.5, 0, 0.75, 0],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeInOutQuart: [0.76, 0, 0.24, 1],
  easeInQuint: [0.64, 0, 0.78, 0],
  easeOutQuint: [0.22, 1, 0.36, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
  easeInExpo: [0.7, 0, 0.84, 0],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutExpo: [0.87, 0, 0.13, 1],
  easeInCirc: [0.55, 0, 1, 0.45],
  easeOutCirc: [0, 0.55, 0.45, 1],
  easeInOutCirc: [0.85, 0, 0.15, 1],
  easeInBack: [0.36, 0, 0.66, -0.56],
  easeOutBack: [0.34, 1.56, 0.64, 1],
  easeInOutBack: [0.68, -0.6, 0.32, 1.6],
};

// Elastic and bounce do not fit a cubic-bezier: they become linear() with sampled points.
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;
const bounceOut: Fn = (x) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};
const SAMPLED: Record<string, Fn> = {
  easeInElastic: (x) => (x === 0 ? 0 : x === 1 ? 1 : -(2 ** (10 * x - 10)) * Math.sin((x * 10 - 10.75) * c4)),
  easeOutElastic: (x) => (x === 0 ? 0 : x === 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1),
  easeInOutElastic: (x) =>
    x === 0
      ? 0
      : x === 1
        ? 1
        : x < 0.5
          ? -(2 ** (20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
          : (2 ** (-20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1,
  easeInBounce: (x) => 1 - bounceOut(1 - x),
  easeOutBounce: bounceOut,
  easeInOutBounce: (x) => (x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2),
};

export const EASING_NAMES = [...Object.keys(BEZIER), ...Object.keys(SAMPLED)];

const round = (n: number, d = 4) => +n.toFixed(d);

function toLinear(fn: Fn, points: number): string {
  // First and last stops are pinned to 0 and 1 so the animation never jumps at the ends.
  const stops = Array.from({ length: points + 1 }, (_, i) => (i === 0 ? 0 : i === points ? 1 : round(fn(i / points))));
  return `linear(${stops.join(", ")})`;
}

/** Damped spring, like Motion/Framer: returns linear() and the time until it settles. */
export function spring(opts: { stiffness: number; damping: number; mass: number }) {
  const { stiffness: k, damping: c, mass: m } = opts;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const x: Fn = (t) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    }
    if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  };
  // Duration: last moment the spring is outside ±0.1% of the target.
  const dt = 1 / 240;
  let settle = 0;
  for (let t = 0; t < 10; t += dt) if (Math.abs(x(t) - 1) > 0.001) settle = t;
  const duration = Math.max(0.05, settle + dt);
  return {
    durationMs: Math.round(duration * 1000),
    css: toLinear((p) => x(p * duration), 60),
    overshoot: zeta < 1,
  };
}

export function getEasing(name: string) {
  if (BEZIER[name]) {
    const b = BEZIER[name];
    return { name, kind: "cubic-bezier", css: `cubic-bezier(${b.join(", ")})`, motion: b, gsapHint: gsapName(name) };
  }
  if (SAMPLED[name]) {
    return { name, kind: "linear()", css: toLinear(SAMPLED[name], 50), gsapHint: gsapName(name) };
  }
  throw new Error(`Unknown easing: ${name}. Options: ${EASING_NAMES.join(", ")}`);
}

// easeOutCubic → "power2.out" (GSAP names)
function gsapName(name: string): string {
  const m = /^ease(InOut|In|Out)(\w+)$/.exec(name);
  if (!m) return name;
  const dir = { In: "in", Out: "out", InOut: "inOut" }[m[1]]!;
  const map: Record<string, string> = {
    Sine: "sine", Quad: "power1", Cubic: "power2", Quart: "power3", Quint: "power4",
    Expo: "expo", Circ: "circ", Back: "back", Elastic: "elastic", Bounce: "bounce",
  };
  return `${map[m[2]] ?? m[2].toLowerCase()}.${dir}`;
}

// ---------- Eased gradient ----------

export function easingGradient(opts: {
  from: string;
  to: string;
  easing: string;
  direction: string;
  steps: number;
}) {
  const fn = easingFn(opts.easing);
  const stops = Array.from({ length: opts.steps + 1 }, (_, i) => {
    const pos = i / opts.steps;
    const mix = round(fn(pos) * 100, 2);
    return `color-mix(in oklab, ${opts.from}, ${opts.to} ${mix}%) ${round(pos * 100, 2)}%`;
  });
  return {
    css: `linear-gradient(${opts.direction}, ${stops.join(", ")})`,
    note: "Uses color-mix() (Chrome 111+, Safari 16.2+, Firefox 113+). For a scrim over an image, use to: transparent.",
  };
}

function easingFn(name: string): Fn {
  if (SAMPLED[name]) return SAMPLED[name];
  const b = BEZIER[name];
  if (!b) throw new Error(`Unknown easing: ${name}`);
  return cubicBezier(...b);
}

/** Evaluates a CSS cubic-bezier at x (bisection search). */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): Fn {
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 30; i++) {
      const v = bez(t, x1, x2);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return bez(t, y1, y2);
  };
}
