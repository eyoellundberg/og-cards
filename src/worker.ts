import { ImageResponse } from "workers-og";
import { dataUrl, fonts, layout, readText, type Assets, type Spec, type Text } from "./card.js";

export type { Assets, Spec, Text };

// The ground as a data URL, made once per isolate.
let ground: { bytes: ArrayBuffer; url: string } | undefined;

// One card as a PNG response.
export function card(text: Text, spec: Spec, assets: Assets): Response {
  if (ground?.bytes !== assets.ground) ground = { bytes: assets.ground, url: dataUrl(assets.ground) };
  const image = new ImageResponse(layout(text, spec, ground.url) as never, { width: 1200, height: 630, fonts: fonts(assets) });
  return new Response(image.body, { headers: { "content-type": "image/png" } });
}

// GET /og?title=&kicker=: the card, cached at the edge for a year (the same query is the same card); 400 without a title.
export async function og(request: Request, spec: Spec, assets: Assets, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  const text = readText(new URL(request.url));
  if (!text) return new Response("title is required", { status: 400 });
  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(request.url);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = card(text, spec, assets);
  res.headers.set("cache-control", "public, max-age=31536000, immutable");
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
