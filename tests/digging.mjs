import assert from 'node:assert/strict';
import { generateSlashes } from '../src/slashes.ts';
import { solveGrid, countSolutions, digGrid } from '../src/solver.ts';

for (let run = 0; run < 30; run++) {
  const slashes = generateSlashes();
  const completed = solveGrid(slashes);
  assert.ok(completed);
  assert.equal(countSolutions(slashes, completed), 1);
  assert.equal(countSolutions(slashes, Array.from({ length: 36 }, () => [])), 2);
  const puzzle = digGrid(slashes, completed);
  assert.equal(countSolutions(slashes, puzzle), 1, 'dug puzzle must be unique');
  assert.ok(puzzle.some(digits => digits.length === 0));
  assert.deepEqual(completed.flat().length, 54);
  const check = indices => assert.equal(indices.flatMap(i => completed[i]).sort().join(''), '123456789');
  for (let u = 0; u < 6; u++) {
    check(Array.from({ length: 6 }, (_, c) => u * 6 + c));
    check(Array.from({ length: 6 }, (_, r) => r * 6 + u));
    const start = Math.floor(u / 2) * 12 + (u % 2) * 3;
    check([0, 1, 2, 6, 7, 8].map(i => start + i));
  }
  for (let i = 0; i < 36; i++) {
    assert.equal(completed[i].length, slashes[i] ? 2 : 1);
    if (slashes[i]) assert.ok(completed[i][0] < completed[i][1]);
    if (!puzzle[i].length) continue;
    assert.deepEqual(puzzle[i], completed[i], 'whole cell clues must be preserved');
    const without = puzzle.map(digits => [...digits]);
    without[i] = [];
    assert.equal(countSolutions(slashes, without), 2, 'every remaining clue must be necessary');
  }
  const invalid = completed.map(digits => [...digits]);
  invalid[0] = [0];
  assert.equal(countSolutions(slashes, invalid), 0);
}
console.log('30 puzzles passed: valid completed grids, unique solutions, whole-cell digging, and every remaining given necessary.');
