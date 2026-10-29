import assert from 'node:assert/strict';
import { generateSlashes } from '../src/slashes.ts';
import { solveGrid } from '../src/solver.ts';
import { createModel, hasCompletion, bit } from '../src/logic/board.ts';
import { intersections, subsets, fish, wings, finnedFish, alsXZ } from '../src/logic/techniques.ts';
import { chains, forcing } from '../src/logic/chains.ts';
let seed = 987654;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

// Synthetic candidate states exercise pattern finders directly instead of hiding
// them behind the easy singles that generated puzzles usually offer first.
const hits = new Map();
for (let run = 0; run < 100; run++) {
  const layout = generateSlashes(), model = createModel(layout), full = solveGrid(layout);
  const masks = model.slots.map(s => {
    let m = bit(full[s.cell][s.half]);
    for (let d = 1; d <= 9; d++) if (Math.random() < .22) m |= bit(d);
    if ((m & (m - 1)) === 0) m |= bit(full[s.cell][s.half] % 9 + 1);
    return m;
  });
  assert.ok(hasCompletion(model, masks));
  for (const finder of [intersections, subsets, fish, wings, finnedFish, chains, alsXZ, forcing]) {
    const step = finder(model, masks);
    if (!step) continue;
    hits.set(finder.name, (hits.get(finder.name) ?? 0) + 1);
    for (const p of step.removals) {
      const trial = [...masks]; trial[p.slot] = bit(p.digit);
      assert.equal(hasCompletion(model, trial), false, `${step.technique}: ${step.explanation}`);
    }
    for (const p of step.placements) {
      const trial = [...masks]; trial[p.slot] &= ~bit(p.digit);
      assert.equal(hasCompletion(model, trial), false, step.technique);
    }
  }
}
for (const name of ['intersections', 'subsets', 'fish', 'wings', 'finnedFish', 'chains', 'alsXZ', 'forcing']) assert.ok(hits.get(name), `${name} must be exercised`);
console.log('Pattern deductions independently verified:', Object.fromEntries(hits));
