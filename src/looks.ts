import type { Rgb } from "./css.js";

// The three colors every look is drawn from; a project's config names the CSS token for each.
export type Colors = { paper: Rgb; accent: Rgb; ink: Rgb };

// A look is a fragment shader on the CPU: the color at uv (centred, y up, 1 = the image's height) before dithering.
export type Look = (x: number, y: number, c: Colors) => Rgb;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const fract = (v: number) => v - Math.floor(v);

// The still frame of the hero shader in haudly site/src/Field.tsx (t = 4): soft domain-warped blobs `a` and `b`, and
// two guilloche ring sets turning against each other, `g` (0..1).
const s = 4 * 0.035;
function field(x: number, y: number) {
  const wx = x + 0.18 * Math.sin(y * 2.4 + s * 3), wy = y + 0.18 * Math.cos(x * 2.1 - s * 2);
  const a = 0.5 + 0.5 * Math.sin(wx * 2.2 + s * 2 + Math.sin(wy * 1.7));
  const b = 0.5 + 0.5 * Math.sin(wy * 2.6 - s * 1.5 + Math.cos(wx * 1.3));
  let g = 0;
  for (const [cx, cy, k] of [[0.45, 0.05, 1], [-0.55, -0.15, -1]] as const) {
    const dx = x - cx, dy = y - cy;
    const rr = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const rad = rr + 0.035 * Math.sin(9 * th + s * 6 * k) + 0.02 * Math.sin(15 * th - s * 4);
    g += smoothstep(0.07, 0, Math.abs(fract(rad * 30) - 0.5)) * smoothstep(0.75, 0.15, rr);
  }
  return { a, b, g: clamp(g) };
}

const cream: Rgb = [1, 0.96, 0.88];

export const LOOKS = {
  // A, the hero: white into cream with a breath of the accent, the rings in the accent at 85%.
  hero(x, y, c) {
    const { a, b, g } = field(x, y);
    return mix(mix(mix(c.paper, cream, 0.3 + b * 0.5), c.accent, a * 0.12), c.accent, g * 0.85);
  },
  // C, blue paper: the accent as the ground, the rings in a deeper shade of it (the accent 40% toward ink).
  blue(x, y, c) {
    const { a, b, g } = field(x, y);
    const ground = mix(mix(c.accent, c.paper, b * 0.12), c.ink, a * 0.06);
    return mix(ground, mix(c.accent, c.ink, 0.4), g * 0.85);
  },
} satisfies Record<string, Look>;

export type LookName = keyof typeof LOOKS;
