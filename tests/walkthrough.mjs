import assert from 'node:assert/strict';
import { generateSlashes } from '../src/slashes.ts';
import { solveGrid, digGrid } from '../src/solver.ts';
import { buildWalkthrough } from '../src/logic/walkthrough.ts';
import { createModel, initialMasks, bit } from '../src/logic/board.ts';
import { TECHNIQUES, techniqueInfo, findTechnique, nextLogicalStep, difficulty } from '../src/logic/catalog.ts';
import { getHint } from '../src/logic/hints.ts';
import { checkGrid } from '../src/check.ts';
let seed = 73129;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
assert.equal(TECHNIQUES.at(-1).name, 'Brute Force');
assert.equal(techniqueInfo('Brute Force').score, 10000);
assert.equal(new Set(TECHNIQUES.map(t => t.name)).size, TECHNIQUES.length);
assert.equal(difficulty(10001, ['Brute Force']), 'Brute Force');
assert.equal(difficulty(801, ['Naked Single']), 'Medium');
assert.equal(difficulty(4, ['Naked Single']), 'Easy');

let total = 0;
for (let run = 0; run < 12; run++) {
  const layout = generateSlashes(), completed = solveGrid(layout), puzzle = digGrid(layout, completed);
  const frozen = JSON.stringify(puzzle), walk = buildWalkthrough(layout, puzzle), model = createModel(layout);
  assert.equal(JSON.stringify(puzzle), frozen);
  assert.ok(walk.frames.length > 1);
  assert.equal(walk.frames[0].cumulative, 0);
  assert.deepEqual(walk.frames.at(-1).values, completed);
  assert.equal(checkGrid(layout, walk.frames.at(-1).values).solved, true);
  let score = 0;
  for (let n = 1; n < walk.frames.length; n++) {
    const frame = walk.frames[n], prior = walk.frames[n - 1];
    const entered = model.slots.map(s => prior.values[s.cell][s.half]);
    const step = frame.step;
    if (step.technique === 'Brute Force') assert.equal(getHint(layout, prior.values, prior.masks).status, 'stalled');
    const callable = findTechnique(step.technique, model, prior.masks, entered);
    assert.ok(callable, `${step.technique} must be callable`);
    assert.equal(callable.technique, step.technique);
    const values = prior.values.map(ds => [...ds]), masks = [...prior.masks];
    for (const removal of step.removals) masks[removal.slot] &= ~bit(removal.digit);
    for (const placement of step.placements) {
      const slot = model.slots[placement.slot]; values[slot.cell][slot.half] = placement.digit; masks[placement.slot] = bit(placement.digit);
    }
    assert.deepEqual(frame.values, values);
    assert.deepEqual(frame.masks, initialMasks(model, values).map((m, s) => m & masks[s]));
    assert.notEqual(frame.values, prior.values);
    assert.notEqual(frame.masks, prior.masks);
    score += techniqueInfo(step.technique).score;
    assert.equal(frame.points, techniqueInfo(step.technique).score);
    assert.equal(frame.cumulative, score);
    for (const s of model.slots) if (puzzle[s.cell]?.length) assert.equal(frame.values[s.cell][s.half], puzzle[s.cell][s.half]);
  }
  assert.equal(walk.rating, score);
  total += walk.frames.length - 1;
}
const layout = generateSlashes(), solution = solveGrid(layout), partial = solution.map(d => [...d]);
partial[layout.indexOf(true)] = [];
const normal = buildWalkthrough(layout, partial);
assert.equal(normal.bruteUses, 0, 'use available logic before backtracking');
const forced = buildWalkthrough(layout, partial, []);
assert.equal(forced.bruteUses, 2, 'fallback places one digit position per use');
assert.equal(forced.rating, 20000);
assert.ok(forced.frames.slice(1).every(f => f.step.technique === 'Brute Force' && f.points === 10000));
assert.deepEqual(forced.frames.at(-1).values, solution);
const invalid = solution.map(d => [...d]); invalid[0][0] = invalid[1][0];
assert.throws(() => buildWalkthrough(layout, invalid), /inconsistent/);
// An explicitly conflicting completed unit cannot be turned into a walkthrough.
const model = createModel(layout), badMasks = initialMasks(model, solution); badMasks[0] = 0;
assert.equal(nextLogicalStep(model, badMasks, model.slots.map(s => solution[s.cell][s.half]), []), null);
for (const technique of TECHNIQUES) {
  assert.equal(typeof technique.find, 'function');
  const step = findTechnique(technique.name, model, initialMasks(model, partial), model.slots.map(s => partial[s.cell]?.[s.half] ?? 0));
  if (step) assert.equal(step.technique, technique.name);
}
assert.equal(buildWalkthrough(layout, solution).frames.length, 1);
console.log(`Walkthrough tests passed: ${total} replayed steps, registry callability, immutable snapshots, exact scores, solved terminal state and +10,000 per fallback use.`);
