// The same seeds under three humours:  node tools/humours-sheet.js
// Rows are seeds; columns hold the humours on the seeded stream, on stress,
// and on calm. Each section runs until its material is spent.
import { writeFileSync, mkdirSync } from "node:fs";
import { createState, step, maxOverhang } from "../docs/viab.js";
import { sectionSheet } from "../docs/sheet.js";
const seeds = [3, 5, 7], modes = [["seeded stream", null], ["held on stress", { stress: 1, calm: 0 }], ["held on calm", { stress: 0, calm: 1 }]];
const cell = 3, tiles = [];
for (const seed of seeds) for (const [label, override] of modes) {
  const state = createState({ seed }); state.override = override;
  for (let i = 0; i < 20000 && !state.finished; i++) step(state);
  const inner = sectionSheet(state, { compact: true, cell, overlay: false });
  const m = inner.match(/viewBox="0 0 (\d+) (\d+)"/);
  tiles.push({ w: Number(m[1]), h: Number(m[2]), svg: inner.replace(/^<svg [^>]*>/, "").replace(/<\/svg>\s*$/, ""),
    caption: `seed ${seed} / ${label} / tick ${state.t} / max overhang ${maxOverhang(state.grid)}` });
}
const FONT = "IBM Plex Mono, ui-monospace, Menlo, monospace", cols = modes.length, pad = 48;
const tw = tiles[0].w + 16, th = tiles[0].h + 26, rows = seeds.length;
const W = pad * 2 + cols * tw, H = pad * 2 + 24 + rows * th;
let body = "";
tiles.forEach((t, i) => {
  const x = pad + (i % cols) * tw, y = pad + 24 + Math.floor(i / cols) * th;
  body += `<g transform="translate(${x} ${y})">${t.svg}<text x="10" y="${t.h + 11}" font-family="${FONT}" font-size="8" fill="#6b6b6b">${t.caption}</text></g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="nine sections: three seeds under three humours">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#d4d4d4"/>
<text x="${pad}" y="${pad - 14}" font-family="${FONT}" font-size="10" fill="#6b6b6b">sections / three seeds under three humours / the same material, the same rules</text>
<text x="${W - pad}" y="${pad - 14}" font-family="${FONT}" font-size="10" fill="#6b6b6b" text-anchor="end">benmicallef / viab / drawn by the model</text>
${body}
</svg>
`;
mkdirSync("media", { recursive: true });
writeFileSync("media/humours.svg", svg);
console.error(`wrote media/humours.svg — ${tiles.length} sections, ${W}×${H}`);
