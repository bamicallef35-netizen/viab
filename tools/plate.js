// plate.js — draw a grown structure as an SVG plate: four moments of one run
// side by side, in the same system as the page (paper, ink, one accent for
// the sites the viability rule refuses). Run:  node tools/plate.js [seed]
import { writeFileSync, mkdirSync } from "node:fs";
import { createState, step, SOLID, EMPTY, isAttachable, isViable } from "../docs/viab.js";

const seed = Number(process.argv[2] || 3);
const moments = [600, 1800, 3600, 7200];
const state = createState({ seed });
const INK = "#111111", INK2 = "#6b6b6b", RULE = "#d4d4d4", ACCENT = "#0000ee";
const cell = 4, pad = 24, gap = 24;
const gw = state.p.w * cell, gh = state.p.h * cell;
const W = pad * 2 + moments.length * gw + (moments.length - 1) * gap, H = pad * 2 + gh + 54;

function panel(t, ox, oy) {
  const g = state.grid;
  let s = `<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${gw}" height="${gh}" fill="none" stroke="${RULE}"/>`;
  s += `<rect x="${ox}" y="${oy + (g.h - 1) * cell}" width="${gw}" height="${cell}" fill="${INK}"/>`;
  for (let y = 0; y < g.h - 1; y++) for (let x = 0; x < g.w; x++) {
    if (g.get(x, y) === SOLID) s += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell + 0.3}" height="${cell + 0.3}" fill="${INK}"/>`;
    else if (isAttachable(g, x, y) && !isViable(g, x, y, state.p.L)) s += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell}" height="${cell}" fill="${ACCENT}" fill-opacity="0.45"/>`;
  }
  const h = state.lastHumour;
  s += `<text x="${ox}" y="${oy + gh + 18}" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="10" fill="${INK2}">tick ${t} / cells ${g.solidCount()} / stress ${(h.stress * 100).toFixed(0)}% calm ${(h.calm * 100).toFixed(0)}%</text>`;
  return s;
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="four moments of a stigmergic accretion, seed ${seed}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${RULE}"/>
<text x="${pad}" y="${pad - 6}" font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="11" fill="${INK2}">viab / seed ${seed} / growth from four seeds under the viability rule; blue = a site the rule refuses</text>
`;
let done = 0;
for (let t = 1; t <= moments[moments.length - 1]; t++) {
  step(state);
  if (t === moments[done]) { svg += panel(t, pad + done * (gw + gap), pad + 8); done++; }
}
svg += "</svg>\n";
mkdirSync("media", { recursive: true });
writeFileSync("media/plate.svg", svg);
console.error(`wrote media/plate.svg (${W}x${H}), seed ${seed}`);
