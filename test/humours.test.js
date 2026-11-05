// The humours stream and its effect on growth. A synthetic, seeded signal —
// not a model of real affect — that biases a stochastic rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Grid, SOLID, humourAt, biasScore, defaultParams } from "../docs/viab.js";

test("humourAt is deterministic and bounded in 0..1", () => {
  for (let t = 0; t < 500; t += 37) {
    const a = humourAt(t, 1), b = humourAt(t, 1);
    assert.deepEqual(a, b);
    for (const k of ["stress", "calm", "crowding", "repelX"]) {
      assert.ok(a[k] >= 0 && a[k] <= 1, `${k}=${a[k]} out of range`);
    }
    assert.ok(Math.abs(a.stress + a.calm - 1) < 1e-9); // stress and calm are complementary
  }
});

test("stress favours enclosing growth more than calm does", () => {
  const g = new Grid(20, 12);
  // A fully enclosed site (all eight neighbours solid, including below).
  for (const [x, y] of [[4, 6], [6, 6], [5, 5], [4, 5], [6, 5], [4, 7], [6, 7], [5, 7]]) g.set(x, y, SOLID);
  const p = defaultParams();
  const stressed = biasScore(g, 5, 6, { stress: 1, calm: 0, crowding: 0.5, repelX: 0.9 }, p);
  const calm = biasScore(g, 5, 6, { stress: 0, calm: 1, crowding: 0.5, repelX: 0.9 }, p);
  assert.ok(stressed > calm, `stressed ${stressed} should exceed calm ${calm} at an enclosing site`);
});

test("calm favours cantilevering (reach) more than stress does", () => {
  const g = new Grid(20, 12);
  // A reach site: attachable from the side, but nothing directly below.
  g.set(5, 8, SOLID); g.set(5, 7, SOLID); g.set(4, 7, SOLID); // a column with a side anchor at y=7
  const p = defaultParams();
  const calm = biasScore(g, 6, 7, { stress: 0, calm: 1, crowding: 0.5, repelX: 0.9 }, p);
  const stressed = biasScore(g, 6, 7, { stress: 1, calm: 0, crowding: 0.5, repelX: 0.9 }, p);
  assert.ok(calm > stressed, `calm ${calm} should exceed stressed ${stressed} at a cantilever site`);
});

test("repulsion suppresses deposition near the drifting column", () => {
  const g = new Grid(40, 12);
  g.set(10, 10, SOLID); g.set(30, 10, SOLID);
  const p = defaultParams();
  const humour = { stress: 0.5, calm: 0.5, crowding: 0.5, repelX: 10 / 40 }; // column near x=10
  const near = biasScore(g, 10, 9, humour, p);
  const far = biasScore(g, 30, 9, humour, p);
  assert.ok(far > near, `far ${far} should exceed near ${near} under repulsion`);
});
