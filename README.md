# og-cards

Open Graph share cards for any project. The ground is drawn once, at build time, from the colors in the project's CSS;
a Cloudflare Worker sets the brand, a kicker and a title on it per request (satori + resvg-wasm, via workers-og).

The ground is a still frame of a shader (`src/looks.ts`), drawn at half size with a 2px dither and doubled with nearest
neighbour, so the dots stay crisp and the card stays small (~300–350 KB).

## Hook it up

1. **Config.** Put `og-cards.json` beside the fonts (paths are relative to it):

   ```json
   {
     "brand": "Haudly",
     "css": "../app/src/theme.css",
     "look": "hero",
     "colors": { "paper": "white", "accent": "accent", "ink": "ink" },
     "fonts": { "regular": "Geist-Regular.ttf", "semibold": "Geist-SemiBold.ttf", "title": "GreedWide-Medium.otf" }
   }
   ```

   `colors` names a `--color-*` token in the CSS for each role; the text is set in `ink`. `look` is `hero` (pale
   ground, accent lines) or `blue` (accent ground, deeper lines).

2. **Generate.** `npx og-cards generate og/og-cards.json` writes `ground.png` and `card.json` next to the config.
   Commit both; run it again when the CSS colors change.

3. **Mount.** In the Worker, load the bytes your bundler's way and hand them over:

   ```ts
   import { og } from "og-cards";
   import spec from "./og/card.json";
   // ground, regular, semibold, title: ArrayBuffers (Wrangler Data modules, or Vite ?inline decoded)

   if (url.pathname === "/og") return og(request, spec, { ground, regular, semibold, title }, ctx);
   ```

   `/og?title=&kicker=` answers with the PNG, cached at the edge for a year. For a card of your own text, call
   `card({ title, kicker }, spec, assets)`.

## CLI

- `og-cards generate <config>` writes the ground and card.json.
- `og-cards preview <config> <title> [kicker]` writes preview.png: the card as the Worker serves it, with its size.
- `og-cards sheet <config> <title> [kicker]` writes sheet.png: every look as a card, with real file sizes.

`npm test` checks the colors, the dots, the PNG and that every look renders under 450 KB.
