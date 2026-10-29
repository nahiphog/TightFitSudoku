import { createModel, initialMasks, countCompletions } from './logic/board';
/** Fill a fixed slash layout; both halves share their cell's three units. */
function searchGrid(slashes: readonly boolean[], givens: readonly (readonly number[])[], limit: number): { count: number; solution: number[][] | null } {
  if (slashes.length !== 36) throw new Error('Expected 36 cells.');
  const units = Array.from({ length: 36 }, (_, i) => [Math.floor(i / 6), 6 + i % 6, 12 + Math.floor(i / 12) * 2 + Math.floor((i % 6) / 3)]);
  const used = Array<number>(18).fill(0);
  const values: number[][] = Array.from({ length: 36 }, () => []);
  const order = Array.from({ length: 9 }, (_, i) => i + 1);
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let count = 0;
  let solution: number[][] | null = null;
  let empty = 36;
  for (let i = 0; i < 36; i++) {
    const digits = givens[i] ?? [];
    if (!digits.length) continue;
    if (digits.length !== (slashes[i] ? 2 : 1) || digits.some(d => !Number.isInteger(d) || d < 1 || d > 9) || (slashes[i] && digits[0] >= digits[1])) return { count: 0, solution: null };
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
    for (let i = 0; i < 36; i++) {
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
  const cells = Array.from({length: 36}, (_, i) => i);
  for (let i = 35; i > 0; i--) {
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

