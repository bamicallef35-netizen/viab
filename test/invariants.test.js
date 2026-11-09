// The headline guarantees: no floating material ever, and full reproducibility.
import { test } from "node:test";
import assert from "node:assert/strict";
import { run, createState, step, invariantHolds, defaultParams, isReserved } from "../docs/viab.js";

const SMALL = { w: 48, h: 30, agents: 12, ticks: 500 };

test("support invariant holds after a full run, across many seeds", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { grid, metrics } = run({ ...SMALL, seed });
    assert.equal(metrics.invariant, true, `seed ${seed} left floating material`);
    assert.equal(invariantHolds(grid, defaultParams().L), true);   // the run's own cantilever limit
  }
});

test("the invariant holds at every intermediate tick, not just the end", () => {
  const state = createState({ ...SMALL, seed: 7 });
  for (let i = 0; i < state.p.ticks; i++) {
    step(state);
    if (i % 25 === 0) assert.equal(invariantHolds(state.grid, state.p.L), true, `broke at tick ${i}`);
  }
});

test("something actually grew (the rules are not vacuously satisfied)", () => {
  const { metrics } = run({ ...SMALL, seed: 3 });
  assert.ok(metrics.cells > 20, `only ${metrics.cells} cells grew`);
});

test("determinism: same (seed, params) gives an identical structure", () => {
  const a = run({ ...SMALL, seed: 42 });
  const b = run({ ...SMALL, seed: 42 });
  assert.equal(a.hash, b.hash);
  assert.equal(a.metrics.cells, b.metrics.cells);
});

test("different seeds give different structures (the RNG is live)", () => {
  const a = run({ ...SMALL, seed: 1 });
  const b = run({ ...SMALL, seed: 2 });
  assert.notEqual(a.hash, b.hash);
});

test("termination: a bounded run halts and stays within the lattice", () => {
  const { grid, metrics } = run({ ...SMALL, seed: 9 });
  assert.equal(metrics.ticks, SMALL.ticks);
  assert.ok(metrics.cells >= 1);
  assert.ok(metrics.cells <= grid.w * grid.h);
});

test("agent count is conserved across the run", () => {
  const state = createState({ ...SMALL, seed: 5 });
  const n = state.agents.length;
  for (let i = 0; i < 100; i++) step(state);
  assert.equal(state.agents.length, n);
});

test("a finite material budget ends the run as a finished section", () => {
  const state = createState({ ...SMALL, seed: 11, material: 150 });
  for (let i = 0; i < 4000 && !state.finished; i++) step(state);
  assert.equal(state.finished, true);
  assert.equal(state.grid.solidCount(), 150);
  assert.equal(invariantHolds(state.grid, state.p.L), true);
});

test("reserved chambers are never filled: the programme holds", () => {
  for (const seed of [1, 2, 3]) {
    const state = createState({ ...SMALL, seed, chambers: 4 });
    assert.ok(state.grid.chambers.length === 4);
    for (let i = 0; i < 800; i++) step(state);
    for (let y = 0; y < state.grid.h - 1; y++) for (let x = 0; x < state.grid.w; x++) {
      if (isReserved(state.grid, x, y)) assert.equal(state.grid.get(x, y), 0, `seed ${seed}: material in a chamber at ${x},${y}`);
    }
  }
});
