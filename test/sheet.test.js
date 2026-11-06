// The section sheet is a drawing of the model's own state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { run } from "../docs/viab.js";
import { sectionSheet } from "../docs/sheet.js";

test("the sheet is a well-formed SVG carrying the record and the rules", () => {
  const { grid } = run({ w: 48, h: 30, agents: 12, ticks: 300, seed: 5 });
  const state = { grid, p: { w: 48, h: 30, L: 4, seed: 5, material: 1400 }, t: 300, deposits: grid.solidCount(), lastHumour: { stress: 0.5, calm: 0.5 }, override: null };
  const svg = sectionSheet(state);
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes("seed 5 / tick 300"));
  assert.ok(svg.includes("10 units"));
  assert.ok(svg.includes("units of support"));          // the procedure row states the rules
  assert.ok(svg.includes("chambers"));                  // the programme row names the reserved voids
  assert.ok((svg.match(/<rect/g) || []).length > grid.solidCount());
});

test("a compact tile carries the section and no title block", async () => {
  const { run } = await import("../docs/viab.js");
  const { sectionSheet } = await import("../docs/sheet.js");
  const tile = sectionSheet(run({ seed: 2, material: 200, w: 40, h: 24 }), { compact: true, cell: 3 });
  assert.ok(tile.startsWith("<svg") && tile.includes("<rect") && !tile.includes("procedure") && !tile.includes("10 units"));
});
