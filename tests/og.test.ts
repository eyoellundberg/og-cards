import { describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { color, colors, hex } from "../src/css.js";
import { assets, load, spec } from "../src/config.js";
import { ground, png, WIDTH, HEIGHT } from "../src/ground.js";
import { LOOKS } from "../src/looks.js";
import { readText } from "../src/card.js";
import { renderCard } from "../src/render.js";

const config = load(new URL("fixtures/og-cards.json", import.meta.url).pathname);

describe("css", () => {
  it("reads the light value of each token, short hex too", () => {
    const all = colors("@theme { --color-white: #fff; --color-ink: #050505; } :root[data-theme=dark] { --color-ink: #ffffff; }");
    expect(hex(color(all, "white"))).toBe("#ffffff");
    expect(hex(color(all, "ink"))).toBe("#050505");
  });
  it("stops on a token the CSS does not set", () => {
    expect(() => color(colors("--color-ink: #000;"), "accent")).toThrow(/no --color-accent/);
  });
});

describe("ground", () => {
  const rgb = ground(LOOKS.hero, config.colors);
  it("is 1200x630 in 2px dots: each pixel pair is one dot", () => {
    expect(rgb.length).toBe(WIDTH * HEIGHT * 3);
    for (let y = 0; y < HEIGHT; y += 2) for (let x = 0; x < WIDTH; x += 2) {
      const at = (dx: number, dy: number) => rgb.subarray(((y + dy) * WIDTH + x + dx) * 3, ((y + dy) * WIDTH + x + dx) * 3 + 3).join();
      expect(at(1, 0) === at(0, 0) && at(0, 1) === at(0, 0) && at(1, 1) === at(0, 0)).toBe(true);
    }
  });
  it("uses only the 9 dither levels a channel", () => {
    const levels = new Set(Array.from({ length: 9 }, (_, i) => Math.round((255 * i) / 8)));
    expect(rgb.every((v) => levels.has(v))).toBe(true);
  });
  it("encodes as a PNG that inflates back to the pixels", () => {
    const file = Buffer.from(png(rgb));
    expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([WIDTH, HEIGHT]);
    const idat = file.subarray(41, 41 + file.readUInt32BE(33));
    const raw = inflateSync(idat);
    expect(raw.subarray(1, 1 + WIDTH * 3).equals(Buffer.from(rgb.subarray(0, WIDTH * 3)))).toBe(true);
  });
});

describe("card", () => {
  it("takes the title and kicker from the query, a title is required", () => {
    expect(readText(new URL("https://x/og?title=%20Hi%20&kicker=Yo"))).toEqual({ title: "Hi", kicker: "Yo" });
    expect(readText(new URL("https://x/og?kicker=Yo"))).toBeNull();
  });
  it("sets the text in the CSS ink", () => {
    expect(spec(config)).toEqual({ brand: "Acme", ink: "#050505" });
  });
  it("renders each look as a 1200x630 PNG under 450 KB", async () => {
    for (const look of Object.values(LOOKS)) {
      const out = Buffer.from(await renderCard({ title: "Forecast for 2026", kicker: "Invoice from Acme" }, spec(config), assets(config, png(ground(look, config.colors)))));
      expect([out.readUInt32BE(16), out.readUInt32BE(20)]).toEqual([1200, 630]);
      expect(out.length).toBeLessThan(450 * 1024);
    }
  }, 60_000);
});
