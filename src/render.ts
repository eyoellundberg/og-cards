import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { dataUrl, fonts, layout, type Assets, type Node, type Spec, type Text } from "./card.js";

// The card as the Worker draws it (workers-og is satori + resvg-wasm at these versions), for the CLI and the tests.
let ready: Promise<void> | undefined;

export async function render(node: Node, width: number, height: number, a: Assets): Promise<Uint8Array> {
  ready ??= initWasm(readFileSync(createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm")));
  await ready;
  const svg = await satori(node as never, { width, height, fonts: fonts(a) });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

export const renderCard = (text: Text, spec: Spec, a: Assets) => render(layout(text, spec, dataUrl(a.ground)), 1200, 630, a);
