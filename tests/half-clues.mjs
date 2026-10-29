import assert from 'node:assert/strict';
import { generateSlashes } from '../src/slashes.ts';
import { solveGrid, countSolutions } from '../src/solver.ts';
import { buildAttempt, validateBuild } from '../src/custom-build-engine.ts';
import { buildWalkthrough } from '../src/logic/walkthrough.ts';
import { createModel, countCompletions, initialMasks } from '../src/logic/board.ts';
let seed = 27812;
Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
for (let run = 0; run < 12; run++) {
  const layout = generateSlashes(), model = createModel(layout), solution = solveGrid(layout);
  const keys = model.slots.map(s => s.cell * 2 + s.half), split = layout.indexOf(true);
  for (const blankHalf of [0, 1]) {
    const selectedDigits = keys.filter(key => key !== split * 2 + blankHalf);
    const request = { layout, selected: [], selectedDigits, minimum: 0, maximum: 100000 };
    const attempt = buildAttempt(request);
    assert.ok(attempt.result, 'one missing half must yield a unique built puzzle');
    const { puzzle, walkthrough } = attempt.result;
    assert.equal(puzzle[split][blankHalf], 0);
    assert.ok(puzzle[split][1 - blankHalf] > 0);
    assert.equal(countSolutions(layout, puzzle), 1);
    assert.equal(puzzle.flat().filter(Boolean).length, 53);
    assert.ok(walkthrough.frames.at(-1).values[split][blankHalf] > 0);
    puzzle.forEach((digits, cell) => digits.forEach((digit, half) => assert.equal(!!digit, selectedDigits.includes(cell * 2 + half))));
    for (const frame of walkthrough.frames) assert.equal(frame.values[split][1 - blankHalf], puzzle[split][1 - blankHalf], 'preserve the retained half throughout replay');
    const exported = JSON.parse(JSON.stringify({ slashes: layout, cells: puzzle }));
    assert.equal(exported.cells[split][blankHalf], 0);
    assert.equal(exported.cells[split][1 - blankHalf], puzzle[split][1 - blankHalf]);
  }
  const partial = solution.map(d => [...d]); partial[split][run % 2] = 0;
  assert.equal(countSolutions(layout, partial), countCompletions(model, initialMasks(model, partial)));
  assert.deepEqual(buildWalkthrough(layout, partial).frames.at(-1).values, solution);
  const reversed = solution.map(d => [...d]); reversed[split].reverse();
  assert.equal(countSolutions(layout, reversed), 0);
  const sparse = layout.map((split, cell) => split && cell === layout.indexOf(true) ? [1, 0] : []);
  assert.equal(countSolutions(layout, sparse), 2);
  assert.ok(validateBuild({ layout, selected: [], selectedDigits: [], minimum: 0, maximum: 100 }));
  const single = layout.indexOf(false);
  assert.ok(validateBuild({ layout, selected: [], selectedDigits: [single * 2 + 1], minimum: 0, maximum: 100 }));
}
console.log('Half-clue tests passed: upper/lower-only masks, 24 unique builds, partial-pair solution counts, preserved clue halves, blank exports and walkthrough completion.');
