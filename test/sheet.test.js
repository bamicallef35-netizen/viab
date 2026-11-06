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
  assert.ok(svg.includes("viability constraint"));
  assert.ok((svg.match(/<rect/g) || []).length > grid.solidCount());
});
