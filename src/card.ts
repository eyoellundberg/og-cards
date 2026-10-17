// What `og-cards generate` writes next to the ground (card.json): the brand on the card and the ink it is set in, read
// from the project's CSS. The Worker imports it, so a card never holds a color the CSS does not.
export type Spec = { brand: string; ink: string };

// The bytes a card is drawn from; each Worker loads them its own way (Vite's ?inline, Wrangler's Data modules).
// text: the brand and kicker (regular 400, semibold 600); title: the display face.
export type Assets = { ground: ArrayBuffer; regular: ArrayBuffer; semibold: ArrayBuffer; title: ArrayBuffer };

export type Text = { title: string; kicker: string };

// A satori node: what React.createElement would make, without React.
export type Node = { type: string; props: { style?: Record<string, string | number>; src?: string; children?: (Node | string)[] | Node | string } };
const div = (style: Record<string, string | number>, children: (Node | string)[] | string): Node => ({ type: "div", props: { style: { display: "flex", ...style }, children } });

// 1200x630: the brand top left; the kicker and the title at the bottom.
export function layout(text: Text, spec: Spec, ground: string): Node {
  const bottom = [div({ maxWidth: 980, fontFamily: "title", fontSize: 84, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }, text.title)];
  if (text.kicker) bottom.unshift(div({ fontSize: 26, fontWeight: 400, marginBottom: 20 }, text.kicker));
  return div(
    { flexDirection: "column", justifyContent: "space-between", width: 1200, height: 630, padding: "72px 80px", color: spec.ink, fontFamily: "text", backgroundImage: `url(${ground})`, backgroundSize: "1200px 630px" },
    [div({ fontSize: 34, fontWeight: 600 }, spec.brand), div({ flexDirection: "column" }, bottom)],
  );
}

export const fonts = (a: Assets) => [
  { name: "text", data: a.regular, weight: 400 as const, style: "normal" as const },
  { name: "text", data: a.semibold, weight: 600 as const, style: "normal" as const },
  { name: "title", data: a.title, weight: 500 as const, style: "normal" as const },
];

// The title and kicker of GET /og?title=&kicker=; null without a title. The title is cut at 90 characters.
export function readText(url: URL): Text | null {
  const title = (url.searchParams.get("title") ?? "").trim().slice(0, 90);
  return title ? { title, kicker: (url.searchParams.get("kicker") ?? "").trim().slice(0, 90) } : null;
}

export function dataUrl(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i += 8192) bin += String.fromCharCode(...view.subarray(i, i + 8192));
  return `data:image/png;base64,${btoa(bin)}`;
}
