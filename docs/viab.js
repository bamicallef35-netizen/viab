// viab.js — decentralized, stigmergic accretion under a viability constraint.
//
// A DOM-free model: N simple agents walk the surface of a growing structure
// on a 2-D vertical lattice and deposit material using only LOCAL perception.
// No agent reads another agent's state. All coordination happens by reading
// and writing the shared grid — stigmergy, the mechanism TERMES uses (Werfel,
// Petersen & Nagpal, Science 2014). Growth is biased by a synthetic stream of
// inhabitants' "humours", after R&Sie(n)'s speculative "Viab".
//
// The same module runs under node:test (test/*.test.js) and in the browser
// (docs/index.html). See README.md for the honest lineage and its limits.

export const EMPTY = 0;
export const SOLID = 1;

// ── Determinism ───────────────────────────────────────────────────────────
// Every random choice routes through a seeded PRNG, so a run is a pure
// function of (seed, params). That is what makes the invariant tests possible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Grid ──────────────────────────────────────────────────────────────────
// Row 0 is the top; row H-1 is the ground. "Below" (x, y) is (x, y+1), so
// gravity points toward larger y, as on a canvas.
export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cells = new Int8Array(w * h);
    for (let x = 0; x < w; x++) this.set(x, h - 1, SOLID); // ground
  }
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }
  // Out of bounds: the side walls and the floor read SOLID (they can bear
  // material), the sky above reads EMPTY (nothing attaches to it).
  get(x, y) {
    if (y < 0) return EMPTY;
    return this.inBounds(x, y) ? this.cells[this.idx(x, y)] : SOLID;
  }
  set(x, y, v) { if (this.inBounds(x, y)) this.cells[this.idx(x, y)] = v; }
  isSolid(x, y) { return this.get(x, y) === SOLID; }

  // Stable FNV-1a 64 (as two 32-bit halves) over the cells — for determinism
  // tests. Returns a hex string.
  hash() {
    let h1 = 0x811c9dc5, h2 = 0x811c9dc5;
    for (let i = 0; i < this.cells.length; i++) {
      h1 ^= this.cells[i]; h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= (this.cells[i] + i) & 0xff; h2 = Math.imul(h2, 0x01000193) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }
  solidCount() {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === SOLID) n++;
    return n - this.w; // discount the ground row
  }
}

// ── Viability ─────────────────────────────────────────────────────────────
// A combinatorial support invariant, NOT statics or FEM. A cell is supported
// if it sits on the ground, rests on a solid cell directly below, or
// cantilevers no more than L contiguous cells from a column that is itself
// resting on something solid. Depositing only ever ADDS solids, and every one
// of these conditions is monotonic under adding solids, so a cell that is
// supported when placed stays supported forever. That is the whole point: the
// deposition rule maintains "no floating material" by construction.
export function isSupported(grid, x, y, L) {
  if (y >= grid.h - 1) return true;         // on (or below) the ground
  if (grid.isSolid(x, y + 1)) return true;  // rests on the cell below
  for (let d = 1; d <= L; d++) {            // cantilever left
    const nx = x - d;
    if (!grid.isSolid(nx, y)) break;        // run must be contiguous solid
    if (grid.isSolid(nx, y + 1)) return true;
  }
  for (let d = 1; d <= L; d++) {            // cantilever right
    const nx = x + d;
    if (!grid.isSolid(nx, y)) break;
    if (grid.isSolid(nx, y + 1)) return true;
  }
  return false;
}

// ── Local deposition rules ────────────────────────────────────────────────
const N4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];

// A cell may only be added touching existing material (a seed-adjacent, local
// rule — an agent cannot teleport a brick into empty space).
export function isAttachable(grid, x, y) {
  if (grid.get(x, y) !== EMPTY) return false;
  for (const [dx, dy] of N4) if (grid.isSolid(x + dx, y + dy)) return true;
  return false;
}

// Do not seal a pocket: after adding c, every EMPTY 4-neighbour of c must keep
// at least one EMPTY 4-neighbour, so voids stay open and the surface stays
// climbable. A TERMES-style ordering/traffic rule, kept local and checkable.
export function trafficOk(grid, x, y) {
  for (const [dx, dy] of N4) {
    const nx = x + dx, ny = y + dy;
    if (!grid.inBounds(nx, ny) || grid.get(nx, ny) !== EMPTY) continue;
    let openNeighbours = 0;
    for (const [ex, ey] of N4) {
      const ax = nx + ex, ay = ny + ey;
      if (ax === x && ay === y) continue;              // c is about to become solid
      if (grid.inBounds(ax, ay) && grid.get(ax, ay) === EMPTY) openNeighbours++;
    }
    if (openNeighbours === 0) return false;
  }
  return true;
}

export function isViable(grid, x, y, L) {
  return isAttachable(grid, x, y) && isSupported(grid, x, y, L) && trafficOk(grid, x, y);
}

// The horizontal overhang of a solid cell: contiguous solids to each side with
// nothing directly below, measured to the nearest supported column.
export function overhang(grid, x, y) {
  if (grid.isSolid(x, y + 1) || y >= grid.h - 1) return 0;
  let best = Infinity;
  for (const dir of [-1, 1]) {
    for (let d = 1; d < grid.w; d++) {
      const nx = x + dir * d;
      if (!grid.isSolid(nx, y)) break;
      if (grid.isSolid(nx, y + 1)) { best = Math.min(best, d); break; }
    }
  }
  return best === Infinity ? grid.w : best;
}

// ── Humours ───────────────────────────────────────────────────────────────
// A synthetic, seeded affective stream — NOT a model of real emotion or
// chemistry. After R&Sie(n)'s idea that inhabitants' stress and calm "affect
// the construction logic of the Viab". It biases a stochastic rule; it does
// not determine the structure.
export function humourAt(t, seed) {
  const r = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const p1 = r() * Math.PI * 2, p2 = r() * Math.PI * 2, p3 = r() * Math.PI * 2;
  const s = 0.5 + 0.5 * Math.sin(t * 0.004 + p1);
  const c = 1 - s;
  const crowding = 0.5 + 0.5 * Math.sin(t * 0.0021 + p2);
  const repelX = 0.5 + 0.5 * Math.sin(t * 0.0013 + p3); // 0..1 of width
  return { stress: s, calm: c, crowding, repelX };
}

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

// Score an attachable candidate under the current humour. Stress favours
// thick, enclosing growth; calm favours reach — it cantilevers outward, stacks
// thin, and declines to infill crowded sites, so calm phases build lace that
// stress phases later fill in; crowding draws
// deposition toward already-dense regions; repulsion suppresses a drifting
// column, so the form leans away from it.
export function biasScore(grid, x, y, humour, params) {
  let solidN = 0;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    if (grid.isSolid(x + dx, y + dy)) solidN++;
  }
  const enclosure = solidN / 8;                       // 0..1
  const height = 1 - y / grid.h;                      // taller = higher
  const reach = grid.isSolid(x, y + 1) ? 0 : 1;       // cantilevering: nothing below
  const repelCol = humour.repelX * grid.w;
  const repel = 1 / (1 + Math.abs(x - repelCol));     // 0..1, peaks at the column
  const w = params.weights;
  return (
    w.base +
    w.stress * humour.stress * enclosure +            // stress fills in, solid
    w.calm * humour.calm * (1 - enclosure) +
    w.reach * humour.calm * reach -                   // calm opens out, cantilevered
    w.calmFill * humour.calm * enclosure +            // ...and declines to infill crowded sites
    w.crowding * humour.crowding * enclosure +
    w.height * height -
    w.repulsion * repel
  );
}

// ── Agent ─────────────────────────────────────────────────────────────────
// Walks on the surface. Each tick it perceives a small local window, scores
// the viable candidates there, and may deposit one; then it steps to an
// adjacent surface cell. It never inspects another agent — only the grid.
export class Agent {
  constructor(x, y) { this.x = x; this.y = y; }
}

// Is (x, y) a place an agent can stand: empty, and resting on/against solid.
function isSurface(grid, x, y) {
  if (grid.get(x, y) !== EMPTY) return false;
  for (const [dx, dy] of N4) if (grid.isSolid(x + dx, y + dy)) return true;
  return false;
}

// ── Simulation ────────────────────────────────────────────────────────────
export function defaultParams() {
  return {
    w: 80, h: 48, L: 4, agents: 30, ticks: 2600, seed: 1,
    perceive: 2, // Chebyshev radius an agent can see/reach
    weights: { base: -0.3, stress: 1.6, calm: 1.2, reach: 3.4, calmFill: 3.0, crowding: 1.0, height: 1.5, repulsion: 1.8 },
  };
}

export function createState(params) {
  const p = Object.assign(defaultParams(), params || {});
  const grid = new Grid(p.w, p.h);
  grid.set(Math.floor(p.w / 2), p.h - 2, SOLID);   // a seed cell on the ground
  const rng = mulberry32(p.seed);
  const agents = [];
  for (let i = 0; i < p.agents; i++) {
    // Spread the agents along the ground, so growth starts as several local
    // fronts instead of one central pile.
    agents.push(new Agent(Math.floor(p.w * (i + 0.5) / p.agents), p.h - 2));
  }
  return { p, grid, rng, agents, t: 0, deposits: 0, lastHumour: humourAt(0, p.seed) };
}

function localCandidates(grid, ax, ay, radius, L) {
  const out = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = ax + dx, y = ay + dy;
      if (grid.inBounds(x, y) && isViable(grid, x, y, L)) out.push([x, y]);
    }
  }
  return out;
}

export function step(state) {
  const { p, grid, rng, agents } = state;
  const humour = humourAt(state.t, p.seed);
  state.lastHumour = humour;
  for (const a of agents) {
    const cands = localCandidates(grid, a.x, a.y, p.perceive, p.L);
    if (cands.length) {
      // Weighted, seeded choice over the softmaxed scores.
      const scores = cands.map(([x, y]) => biasScore(grid, x, y, humour, p));
      const exps = scores.map((s) => Math.exp(s));
      const total = exps.reduce((u, v) => u + v, 0);
      let pick = rng() * total, k = 0;
      while (k < exps.length - 1 && (pick -= exps[k]) > 0) k++;
      const [cx, cy] = cands[k];
      if (rng() < sigmoid(scores[k])) {
        grid.set(cx, cy, SOLID);
        state.deposits++;
      }
    }
    // Step to a surface neighbour (seeded); respawn near the seed if stuck.
    const moves = [];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      if (isSurface(grid, a.x + dx, a.y + dy)) moves.push([a.x + dx, a.y + dy]);
    }
    if (moves.length) {
      const [mx, my] = moves[Math.floor(rng() * moves.length)];
      a.x = mx; a.y = my;
    } else {
      // Stuck (walled in): rejoin the frontier somewhere else along the width.
      a.x = Math.floor(rng() * p.w);
      a.y = p.h - 2;
    }
  }
  state.t++;
  return state;
}

// Every solid cell above the ground satisfies the support invariant.
export function invariantHolds(grid, L) {
  for (let y = 0; y < grid.h - 1; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (grid.isSolid(x, y) && !isSupported(grid, x, y, L)) return false;
    }
  }
  return true;
}

export function maxOverhang(grid) {
  let m = 0;
  for (let y = 0; y < grid.h - 1; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (grid.isSolid(x, y)) m = Math.max(m, overhang(grid, x, y));
    }
  }
  return m;
}

export function run(params) {
  const state = createState(params);
  for (let i = 0; i < state.p.ticks; i++) step(state);
  return {
    grid: state.grid,
    hash: state.grid.hash(),
    metrics: {
      cells: state.grid.solidCount(),
      deposits: state.deposits,
      maxOverhang: maxOverhang(state.grid),
      invariant: invariantHolds(state.grid, state.p.L),
      ticks: state.t,
    },
  };
}
