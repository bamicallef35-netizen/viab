// Support, attachment and traffic rules — the local predicates that decide
// whether a cell may be deposited.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Grid, SOLID, isSupported, isAttachable, trafficOk, isViable, overhang } from "../docs/viab.js";

test("ground and resting cells are supported; mid-air is not", () => {
  const g = new Grid(20, 10); // ground at y=9
  assert.equal(isSupported(g, 5, 9, 3), true);        // on the ground
  g.set(5, 8, SOLID);
  assert.equal(isSupported(g, 5, 8, 3), true);        // rests on the ground below
  assert.equal(isSupported(g, 5, 6, 3), false);       // floating with nothing below or beside
});

test("cantilever limit L: an overhang of L is viable, L+1 is not", () => {
  const g = new Grid(20, 10);
  const L = 3;
  // A column at x=5 up to y=6, resting on the ground.
  g.set(5, 8, SOLID); g.set(5, 7, SOLID); g.set(5, 6, SOLID);
  // Extend a horizontal overhang rightward at y=6.
  g.set(6, 6, SOLID); g.set(7, 6, SOLID); g.set(8, 6, SOLID); // distances 1..3 from the column
  assert.equal(isSupported(g, 8, 6, L), true);        // overhang exactly L
  assert.equal(isSupported(g, 9, 6, L), false);       // overhang L+1 — refused
  assert.equal(overhang(g, 8, 6), 3);
});

test("isAttachable requires an existing solid neighbour", () => {
  const g = new Grid(20, 10);
  g.set(5, 8, SOLID);
  assert.equal(isAttachable(g, 5, 7), true);          // above a solid
  assert.equal(isAttachable(g, 12, 3), false);        // isolated empty cell
  assert.equal(isAttachable(g, 5, 8), false);         // already solid
});

test("trafficOk refuses a deposition that would seal a pocket", () => {
  const g = new Grid(20, 10);
  // Surround an empty cell (5,5) on three sides, leaving only (5,6) open.
  g.set(4, 5, SOLID); g.set(6, 5, SOLID); g.set(5, 4, SOLID);
  // Depositing (5,6) would fully enclose (5,5).
  assert.equal(trafficOk(g, 5, 6), false);
  // A deposition that leaves the pocket open is fine.
  assert.equal(trafficOk(g, 10, 8), true);
});

test("isViable composes attach + support + traffic", () => {
  const g = new Grid(20, 10);
  g.set(5, 8, SOLID);
  assert.equal(isViable(g, 5, 7, 3), true);           // attachable, supported, open
  assert.equal(isViable(g, 12, 3, 3), false);         // not attachable
});
