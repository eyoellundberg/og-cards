import { crc32, deflateSync } from "node:zlib";
import type { Colors, Look } from "./looks.js";

export const WIDTH = 1200, HEIGHT = 630;

// A 2x2 Bayer threshold. The site's shader uses 4x4; on a card the 2x2 looks the same, and its pattern repeats every
// 4 rows, near enough for deflate to find, so resvg's PNG of the card is about a third smaller.
const bayer = (x: number, y: number) => ([[0, 2], [3, 1]][y % 2]![x % 2]! + 0.5) / 4;

// The card's ground, 1200x630 RGB: the look drawn at half size, dithered to 9 levels a channel, then each pixel
// doubled (nearest neighbour), so the dots are 2px and crisp, as on the site.
export function ground(look: Look, c: Colors): Uint8Array {
  const w = WIDTH / 2, h = HEIGHT / 2;
  const out = new Uint8Array(WIDTH * HEIGHT * 3);
  for (let row = 0; row < h; row++) {
    const fy = h - 1 - row + 0.5; // gl_FragCoord.y: up from the bottom
    for (let col = 0; col < w; col++) {
      const fx = col + 0.5;
      const px = look((fx - w / 2) / h, (fy - h / 2) / h, c);
      const d = bayer(col, row) - 0.5;
      for (let ch = 0; ch < 3; ch++) {
        const v = Math.round(255 * Math.min(1, Math.max(0, Math.floor(px[ch]! * 8 + 0.5 + d * 0.8) / 8)));
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) out[((row * 2 + dy) * WIDTH + col * 2 + dx) * 3 + ch] = v;
      }
    }
  }
  return out;
}

// A plain RGB PNG: no filter, deflated.
export function png(rgb: Uint8Array, width = WIDTH, height = HEIGHT): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, width);
  new DataView(ihdr.buffer).setUint32(4, height);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  return Buffer.concat([Buffer.from(sig), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", new Uint8Array())]);
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
