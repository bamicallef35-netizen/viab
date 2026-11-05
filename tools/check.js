// Headless summary of a few runs — a quick sanity read without the browser.
//   node tools/check.js
import { run } from "../docs/viab.js";

for (const seed of [1, 2, 3, 7, 42]) {
  const { metrics, hash } = run({ seed });
  console.log(
    `seed ${String(seed).padStart(3)}  cells ${String(metrics.cells).padStart(4)}` +
    `  maxOverhang ${metrics.maxOverhang}  invariant ${metrics.invariant ? "OK " : "BROKEN"}` +
    `  deposits ${metrics.deposits}  hash ${hash}`
  );
}
