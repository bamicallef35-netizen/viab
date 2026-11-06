// sheet.js — a section drawing of the grown structure as an SVG sheet, with a
// title block in the scenario format R&Sie(n) used for every project
// (programme, area, team, premise) and a scale bar. DOM-free: the page's
// "export sheet" button and the Node tools both use it.
import { SOLID, EMPTY, isAttachable, isViable } from "./viab.js";

const INK = "#111111", INK2 = "#6b6b6b", RULE = "#d4d4d4", ACCENT = "#0000ee";
const FONT = "IBM Plex Mono, ui-monospace, Menlo, monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, size = 11, fill = INK, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

export function sectionSheet(state, opts = {}) {
  const g = state.grid, p = state.p, cell = opts.cell || 9, pad = 48, block = 118;
  const gw = g.w * cell, gh = g.h * cell, W = gw + pad * 2, H = gh + pad * 2 + block;
  let body = `<rect x="${pad + 0.5}" y="${pad + 0.5}" width="${gw}" height="${gh}" fill="none" stroke="${RULE}"/>`;
  for (let y = 0; y < g.h - 1; y++) for (let x = 0; x < g.w; x++) {
    const X = pad + x * cell, Y = pad + y * cell;
    if (g.get(x, y) === SOLID) body += `<rect x="${X}" y="${Y}" width="${cell + 0.4}" height="${cell + 0.4}" fill="${INK}"/>`;
    else if (opts.overlay !== false && g.get(x, y) === EMPTY && isAttachable(g, x, y) && !isViable(g, x, y, p.L))
      body += `<rect x="${X}" y="${Y}" width="${cell}" height="${cell}" fill="${ACCENT}" fill-opacity="0.45"/>`;
  }
  body += `<rect x="${pad}" y="${pad + (g.h - 1) * cell}" width="${gw}" height="${cell}" fill="${INK}"/>`;   // ground
  // scale bar: ten cells
  const sbY = pad + gh + 22;
  body += `<line x1="${pad}" y1="${sbY}" x2="${pad + 10 * cell}" y2="${sbY}" stroke="${INK}" stroke-width="2"/>`;
  body += text(pad + 10 * cell + 8, sbY + 4, "10 units", 10, INK2);
  // title block, scenario format
  const h = state.lastHumour, mode = state.override ? (state.override.stress ? "held on stress" : "held on calm") : "seeded stream";
  const used = g.solidCount(), budget = p.material ? `${used} of ${p.material}` : `${used}`;
  const ty = pad + gh + 54;
  const rows = [
    ["project", "viab — a section through a stigmergic accretion"],
    ["programme", "material deposited by local rule under a viability constraint; no target form"],
    ["area", `${g.w} × ${g.h} units; material ${budget} units`],
    ["procedure", `attach to deposited material; rest within ${p.L} units of support; seal no void; humours ${mode} (stress ${(h.stress * 100).toFixed(0)}%)`],
    ["record", `seed ${p.seed} / tick ${state.t} / deposits ${state.deposits} / invariant ${opts.invariant === false ? "broken" : "held"}`],
  ];
  body += `<line x1="${pad}" y1="${ty - 14}" x2="${pad + gw}" y2="${ty - 14}" stroke="${RULE}"/>`;
  rows.forEach(([k, v], i) => { body += text(pad, ty + i * 16, k, 10, INK2); body += text(pad + 90, ty + i * 16, v, 10, INK); });
  body += text(pad + gw, ty, "benmicallef / viab / drawn by the model", 10, INK2, "end");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="section sheet, seed ${p.seed}, tick ${state.t}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${RULE}"/>
${body}
</svg>
`;
}
