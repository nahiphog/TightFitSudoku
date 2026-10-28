/** Fill a fixed slash layout; both halves share their cell's three units. */
export function solveGrid(slashes: readonly boolean[]): number[][] | null {
  if (slashes.length !== 36) throw new Error('Expected 36 cells.');
  const units = Array.from({ length: 36 }, (_, i) => [Math.floor(i / 6), 6 + i % 6, 12 + Math.floor(i / 12) * 2 + Math.floor((i % 6) / 3)]);
  const used = Array<number>(18).fill(0);
  const values: number[][] = Array.from({ length: 36 }, () => []);
  const order = Array.from({ length: 9 }, (_, i) => i + 1);
  for (let i = 8; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  function search(left: number): boolean {
    if (!left) return true;
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
  return search(36) ? values : null;
}
