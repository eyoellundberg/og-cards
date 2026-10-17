import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { color, colors, hex } from "./css.js";
import { LOOKS, type Colors, type LookName } from "./looks.js";
import { LAYOUT, type Assets, type Spec } from "./card.js";

// og-cards.json, one per project. Paths are relative to the file; ground.png and card.json are written next to it.
//   brand   the name on the card
//   css     the project's tokens (`--color-NAME: #hex`)
//   look    one of LOOKS
//   colors  the CSS token for each of paper, accent and ink; the text is set in ink
//   fonts   regular (400) and semibold (600) for the brand and kicker, title for the title
type File = { brand: string; css: string; look: string; colors: Record<keyof Colors, string>; fonts: Record<"regular" | "semibold" | "title", string> };

export type Config = { dir: string; brand: string; look: LookName; colors: Colors; fonts: File["fonts"] };

export function load(path: string): Config {
  const file = JSON.parse(readFileSync(path, "utf8")) as File;
  const dir = dirname(resolve(path));
  if (!(file.look in LOOKS)) throw new Error(`look "${file.look}" is not one of ${Object.keys(LOOKS).join(", ")}`);
  const all = colors(readFileSync(resolve(dir, file.css), "utf8"));
  return {
    dir,
    brand: file.brand,
    look: file.look as LookName,
    colors: { paper: color(all, file.colors.paper), accent: color(all, file.colors.accent), ink: color(all, file.colors.ink) },
    fonts: file.fonts,
  };
}

export const spec = (c: Config, ground: Uint8Array): Spec => {
  const ink = hex(c.colors.ink);
  const version = createHash("sha256").update(`${LAYOUT}\n${c.brand}\n${ink}\n`).update(ground).digest("hex").slice(0, 10);
  return { brand: c.brand, ink, version };
};

const bytes = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

export const assets = (c: Config, ground: Uint8Array): Assets => ({
  ground: ground.slice().buffer as ArrayBuffer,
  regular: bytes(resolve(c.dir, c.fonts.regular)),
  semibold: bytes(resolve(c.dir, c.fonts.semibold)),
  title: bytes(resolve(c.dir, c.fonts.title)),
});
