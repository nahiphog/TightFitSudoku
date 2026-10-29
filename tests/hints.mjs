import assert from 'node:assert/strict';
import { generateSlashes } from '../src/slashes.ts';
import { solveGrid, digGrid } from '../src/solver.ts';
import { getHint } from '../src/logic/hints.ts';
import { createModel, hasCompletion, bit } from '../src/logic/board.ts';
let seed = 123456;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

const families = new Map();
let solved = 0, stalled = 0, steps = 0;
for (let run = 0; run < 20; run++) {
  const layout = generateSlashes();
  const completed = solveGrid(layout);
  const puzzle = digGrid(layout, completed);
  const model = createModel(layout);
  assert.equal(model.slots.length, 54);
  assert.ok(model.units.every(u => u.length === 9));
  assert.equal(getHint(layout, completed).status, 'solved');
  const invalid = completed.map(d => [...d]);
  const [upper, lower] = model.pairs[0];
  const cell = model.slots[upper].cell;
  invalid[cell].reverse();
  assert.equal(getHint(layout, invalid).status, 'conflict');
  // A partially entered slash must work too.
  const partial = completed.map(d => [...d]);
  partial[cell][1] = 0;
  assert.equal(getHint(layout, partial).status, 'step');
  const values = puzzle.map((d, i) => d.length ? [...d] : Array(layout[i] ? 2 : 1).fill(0));
  let masks;
  for (let turn = 0; turn < 300; turn++) {
    const before = JSON.stringify(values);
    const result = getHint(layout, values, masks);
    assert.equal(JSON.stringify(values), before, 'asking for a hint must not edit entries');
    assert.notEqual(result.status, 'conflict');
    if (result.status === 'solved') { solved++; break; }
    if (result.status === 'stalled') { stalled++; break; }
    const step = result.step;
    assert.ok(step && step.explanation.length > 30);
    families.set(step.technique, (families.get(step.technique) ?? 0) + 1);
    masks = [...result.masks];
    for (const p of step.removals) {
      assert.ok(masks[p.slot] & bit(p.digit));
      const trial = [...masks]; trial[p.slot] = bit(p.digit);
      assert.equal(hasCompletion(model, trial), false, 'eliminated digit must have no completion');
      masks[p.slot] &= ~bit(p.digit);
    }
    for (const p of step.placements) {
      const s = model.slots[p.slot];
      assert.equal(values[s.cell][s.half], 0, 'never overwrite a given or entry');
      assert.equal(p.digit, completed[s.cell][s.half]);
      values[s.cell][s.half] = p.digit;
      masks[p.slot] = bit(p.digit);
    }
    assert.ok(hasCompletion(model, masks));
    steps++;
    if (turn === 299) throw new Error('Hint loop did not terminate.');
  }
  console.log(`Puzzle ${run + 1}: ${solved} solved, ${stalled} stalled`);
}
assert.ok(solved > 0);
console.log({ steps, solved, stalled, families: Object.fromEntries(families) });
