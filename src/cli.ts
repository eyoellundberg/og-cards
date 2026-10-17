#!/usr/bin/env -S npx tsx
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { assets, load, spec } from "./config.js";
import { dataUrl, type Node } from "./card.js";
import { hex } from "./css.js";
import { ground, png } from "./ground.js";
import { LOOKS, type LookName } from "./looks.js";
import { render, renderCard } from "./render.js";

const USAGE = `og-cards generate <og-cards.json>                 write ground.png and card.json next to the config
og-cards preview  <og-cards.json> <title> [kicker]  write preview.png here: the card as the Worker serves it
og-cards sheet    <og-cards.json> <title> [kicker]  write sheet.png here: every look as a card, with its size`;

const kb = (n: number) => `${Math.round(n / 1024)} KB`;
const [command, path, title = "", kicker = ""] = process.argv.slice(2);
if (!command || !path || (command !== "generate" && !title)) {
  console.error(USAGE);
  process.exit(1);
}
const config = load(path);
const groundOf = (look: LookName) => png(ground(LOOKS[look], config.colors));

if (command === "generate") {
  const g = groundOf(config.look);
  writeFileSync(join(config.dir, "ground.png"), g);
  writeFileSync(join(config.dir, "card.json"), JSON.stringify(spec(config, g), null, 2) + "\n");
  console.log(`${config.look}: ground.png ${kb(g.length)}, card.json`);
} else if (command === "preview") {
  const g = groundOf(config.look);
  const out = await renderCard({ title, kicker }, spec(config, g), assets(config, g));
  writeFileSync("preview.png", out);
  console.log(`preview.png ${kb(out.length)}`);
} else if (command === "sheet") {
  const rows: Node[] = [];
  for (const look of Object.keys(LOOKS) as LookName[]) {
    const g = groundOf(look);
    const card = await renderCard({ title, kicker }, spec(config, g), assets(config, g));
    const caption = `${look}${look === config.look ? " (in use)" : ""} · card ${kb(card.length)} · ground ${kb(g.length)}`;
    console.log(caption);
    rows.push({ type: "div", props: { style: { display: "flex", flexDirection: "column", marginBottom: 40 }, children: [
      { type: "div", props: { style: { display: "flex", fontSize: 28, marginBottom: 12 }, children: caption } },
      { type: "img", props: { src: dataUrl(card), style: { width: 1200, height: 630 } } },
    ] } });
  }
  const height = rows.length * (630 + 40 + 46) + 40;
  const sheet = { type: "div", props: { style: { display: "flex", flexDirection: "column", width: 1280, height, padding: 40, background: "#fff", color: hex(config.colors.ink), fontFamily: "text" }, children: rows } };
  writeFileSync("sheet.png", await render(sheet, 1280, height, assets(config, groundOf(config.look))));
  console.log("sheet.png");
} else {
  console.error(USAGE);
  process.exit(1);
}
