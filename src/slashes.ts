/** Randomized backtracking over the 20 possible three-slash rows. */
export function generateSlashes(previous?: readonly boolean[]): boolean[] {
  const patterns = Array.from({ length: 64 }, (_, mask) =>
    Array.from({ length: 6 }, (_, c) => Boolean(mask & (1 << c))),
  ).filter(row => row.filter(Boolean).length === 3);
  const columns = Array<number>(6).fill(0);
  const regions = Array<number>(6).fill(0);
  const result: boolean[] = [];

  function search(r: number): boolean {
    if (r === 6) return !previous || result.some((value, i) => value !== previous[i]);
    const choices = [...patterns];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    for (const row of choices) {
      const band = Math.floor(r / 2) * 2;
      const left = row.slice(0, 3).filter(Boolean).length;
      const additions = [left, 3 - left];
      const remainingRows = 5 - r;
      const remainingRegionCells = r % 2 === 0 ? 3 : 0;
      if (row.some((value, c) => columns[c] + Number(value) > 3 || columns[c] + Number(value) + remainingRows < 3)) continue;
      if (additions.some((count, side) => regions[band + side] + count > 3 || regions[band + side] + count + remainingRegionCells < 3)) continue;
      row.forEach((value, c) => { columns[c] += Number(value); });
      additions.forEach((count, side) => { regions[band + side] += count; });
      result.push(...row);
      if (search(r + 1)) return true;
      result.length -= 6;
      row.forEach((value, c) => { columns[c] -= Number(value); });
      additions.forEach((count, side) => { regions[band + side] -= count; });
    }
    return false;
  }
  if (!search(0)) throw new Error('No valid slash layout found.');
  return result;
}
