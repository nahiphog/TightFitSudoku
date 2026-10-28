export function checkGrid(layout: readonly boolean[], values: readonly (readonly number[])[]): { empty: number; errors: number[]; solved: boolean } {
  const errors = new Set<number>();
  let empty = 0;
  const units: number[][] = Array.from({ length: 18 }, () => []);
  for (let i = 0; i < 36; i++) {
    const digits = values[i] ?? [];
    const size = layout[i] ? 2 : 1;
    for (let h = 0; h < size; h++) {
      if (!digits[h]) empty++;
      else if (!Number.isInteger(digits[h]) || digits[h] < 1 || digits[h] > 9) errors.add(i);
    }
    if (layout[i] && digits[0] && digits[1] && digits[0] >= digits[1]) errors.add(i);
    const r = Math.floor(i / 6), c = i % 6;
    [r, 6 + c, 12 + Math.floor(r / 2) * 2 + Math.floor(c / 3)].forEach(u => units[u].push(i));
  }
  for (const unit of units) {
    const seen = new Map<number, number>();
    for (const cell of unit) for (const digit of values[cell] ?? []) {
      if (!digit) continue;
      if (seen.has(digit)) { errors.add(cell); errors.add(seen.get(digit)!); }
      else seen.set(digit, cell);
    }
  }
  return { empty, errors: [...errors], solved: empty === 0 && errors.size === 0 };
}
