import assert from 'node:assert/strict';
import { generateNineGrid } from '../src/nine-grid.ts';
import { countSolutions } from '../src/solver.ts';

const layouts = new Set();
for (let run = 0; run < 16; run++) {
  const { slashes, completed, puzzle } = generateNineGrid();
  layouts.add(slashes.join(','));
  assert.equal(slashes.filter(Boolean).length, 9);
  assert.ok(puzzle.some(cell => cell.length === 0));
  const check = indices => {
    assert.equal(indices.filter(i => slashes[i]).length, 1);
    assert.deepEqual(indices.flatMap(i => completed[i]).sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9,10]);
  };
  for (let unit = 0; unit < 9; unit++) {
    check(Array.from({ length: 9 }, (_, i) => 9 * unit + i));
    check(Array.from({ length: 9 }, (_, i) => 9 * i + unit));
    const start = Math.floor(unit / 3) * 27 + (unit % 3) * 3;
    check(Array.from({ length: 9 }, (_, i) => start + 9 * Math.floor(i / 3) + i % 3));
  }
  assert.equal(countSolutions(slashes, puzzle), 1);
  for (let i = 0; i < 81; i++) {
    if (slashes[i]) {
      assert.equal(puzzle[i].length, 2);
      assert.ok(puzzle[i][0] < puzzle[i][1]);
      assert.deepEqual(puzzle[i], completed[i]);
    } else if (puzzle[i].length) {
      const without = puzzle.slice();
      without[i] = [];
      assert.equal(countSolutions(slashes, without), 2);
    }
  }
}
assert.ok(layouts.size > 1);
console.log('16 nine-by-nine puzzles passed layout, locked clues, uniqueness, and minimality checks.');
