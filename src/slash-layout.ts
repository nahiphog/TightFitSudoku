export interface SlashCounts { rows: number[]; columns: number[]; regions: number[]; total: number; valid: boolean }
/** A completed layout has exactly three slashes in each of its eighteen units. */
export function slashCounts(layout: readonly boolean[]): SlashCounts {
  const rows = Array<number>(6).fill(0), columns = Array<number>(6).fill(0), regions = Array<number>(6).fill(0);
  layout.forEach((slash, i) => {
    if (!slash || i >= 36) return;
    const row = Math.floor(i / 6), col = i % 6;
    rows[row]++; columns[col]++; regions[Math.floor(row / 2) * 2 + Math.floor(col / 3)]++;
  });
  return { rows, columns, regions, total: rows.reduce((a, b) => a + b, 0), valid: layout.length === 36 && layout.every(value => typeof value === 'boolean') && [...rows, ...columns, ...regions].every(n => n === 3) };
}
