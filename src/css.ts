// The project's colors, read from its CSS: every `--color-NAME: #hex` the file sets, first one wins (so a dark-mode
// override further down does not replace the light value the card is drawn in).
export type Rgb = [number, number, number];

export function colors(css: string): Record<string, Rgb> {
  const out: Record<string, Rgb> = {};
  for (const m of css.matchAll(/--color-([\w-]+)\s*:\s*#([0-9a-f]{6}|[0-9a-f]{3})\s*;/gi)) {
    const name = m[1]!;
    if (!(name in out)) out[name] = rgb(m[2]!);
  }
  return out;
}

// One color by its token name; a missing token stops the build, never falls back to a guess.
export function color(all: Record<string, Rgb>, name: string): Rgb {
  const c = all[name];
  if (!c) throw new Error(`no --color-${name} in the CSS (has: ${Object.keys(all).join(", ")})`);
  return c;
}

function rgb(hex: string): Rgb {
  const h = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}

export const hex = (c: Rgb) => "#" + c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
