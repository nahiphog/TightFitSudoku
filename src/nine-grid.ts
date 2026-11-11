import { digGrid } from './solver';

function shuffle<T>(values: T[]): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function generateNineGrid() {
  const axis = () => shuffle([0, 1, 2]).flatMap(group => shuffle([0, 1, 2]).map(offset => group * 3 + offset));
  const rows = axis(), cols = axis();
  const labels = shuffle(Array.from({ length: 10 }, (_, i) => i + 1));
  const transpose = Math.random() < 0.5;
  const slashes: boolean[] = [], completed: number[][] = [];
  for (let i = 0; i < 81; i++) {
    const a = rows[Math.floor(i / 9)], b = cols[i % 9];
    const [r, c] = transpose ? [b, a] : [a, b];
    // A transversal of the standard Sudoku pattern visits each row, column, and box once.
    const slash = c === (r % 3) * 3 + Math.floor(r / 3);
    const digit = labels[((r % 3) * 3 + Math.floor(r / 3) + c) % 9];
    slashes.push(slash);
    completed.push(slash ? [digit, labels[9]].sort((x, y) => x - y) : [digit]);
  }
  return { slashes, completed, puzzle: digGrid(slashes, completed) };
}
