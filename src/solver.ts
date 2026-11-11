import { createModel, initialMasks, countCompletions } from './logic/board';
/** Fill a fixed slash layout; both halves share their cell's three units. */
function searchGrid(slashes: readonly boolean[], givens: readonly (readonly number[])[], limit: number): { count: number; solution: number[][] | null } {
  const size = slashes.length === 81 ? 9 : 6;
  const length = size * size;
  const symbols = size === 9 ? 10 : 9;
  const boxHeight = size === 9 ? 3 : 2;
  if (slashes.length !== length) throw new Error('Expected 36 or 81 cells.');
  const units = Array.from({ length }, (_, i) => {
    const row = Math.floor(i / size), col = i % size;
    return [row, size + col, 2 * size + Math.floor(row / boxHeight) * (size / 3) + Math.floor(col / 3)];
  });
  const used = Array<number>(3 * size).fill(0);
  const values: number[][] = Array.from({ length }, () => []);
  const order = Array.from({ length: symbols }, (_, i) => i + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let count = 0;
  let solution: number[][] | null = null;
  let empty = length;
  for (let i = 0; i < length; i++) {
    const digits = givens[i] ?? [];
    if (!digits.length) continue;
    if (digits.length !== (slashes[i] ? 2 : 1) || digits.some(d => !Number.isInteger(d) || d < 1 || d > symbols) || (slashes[i] && digits[0] >= digits[1])) return { count: 0, solution: null };
    const mask = digits.reduce((m, d) => m | (1 << d), 0);
    if (units[i].some(unit => used[unit] & mask)) return { count: 0, solution: null };
    values[i] = [...digits];
    units[i].forEach(unit => { used[unit] |= mask; });
    empty--;
  }
  function search(left: number): boolean {
    if (!left) {
      count++;
      solution ??= values.map(digits => [...digits]);
      return count >= limit;
    }
    let best = -1;
    let choices: number[][] = [];
    for (let i = 0; i < length; i++) {
      if (values[i].length) continue;
      const occupied = units[i].reduce((mask, unit) => mask | used[unit], 0);
      const available = order.filter(d => !(occupied & (1 << d)));
      const options = slashes[i]
        ? available.flatMap((a, k) => available.slice(k + 1).map(b => [Math.min(a, b), Math.max(a, b)]))
        : available.map(d => [d]);
      if (!options.length) return false;
      if (best === -1 || options.length < choices.length) {
        best = i;
        choices = options;
        if (choices.length === 1) break;
      }
    }
    for (const digits of choices) {
      const mask = digits.reduce((m, d) => m | (1 << d), 0);
      values[best] = digits;
      units[best].forEach(unit => { used[unit] |= mask; });
      if (search(left - 1)) return true;
      units[best].forEach(unit => { used[unit] &= ~mask; });
      values[best] = [];
    }
    return false;
  }
  search(empty);
  return { count, solution };
}

export function solveGrid(slashes: readonly boolean[]): number[][] | null {
  return searchGrid(slashes, [], 1).solution;
}

/** Counts at most two solutions: zero, unique, or multiple. */
export function countSolutions(slashes: readonly boolean[], givens: readonly (readonly number[])[]): number {
  if (givens.some(ds => ds.includes(0))) {
    if (givens.some((ds, i) => ds.length && (ds.length !== (slashes[i] ? 2 : 1) || ds.some(d => !Number.isInteger(d) || d < 0 || d > 9) || (!slashes[i] && ds[0] === 0)))) return 0;
    try { const model = createModel(slashes); return countCompletions(model, initialMasks(model, givens)); }
    catch { return 0; }
  }
  return searchGrid(slashes, givens, 2).count;
}

/** A rejected removal stays rejected as more clues are removed, so one pass suffices. */
export function digGrid(slashes: readonly boolean[], completed: readonly (readonly number[])[]): number[][] {
  const puzzle = completed.map(digits => [...digits]);
  const cells = slashes.flatMap((slash, i) => slash ? [] : [i]);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (const cell of cells) {
    const saved = puzzle[cell];
    puzzle[cell] = [];
    if (countSolutions(slashes, puzzle) !== 1) puzzle[cell] = saved;
  }
  return puzzle;
}

