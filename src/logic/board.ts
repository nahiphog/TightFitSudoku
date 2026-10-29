/** Tight Fit topology: slashed halves are distinct variables in the same three units. */
export interface Slot { cell: number; half: number; units: number[]; name: string }
export interface Model { slots: Slot[]; units: number[][]; peers: number[][]; pairs: [number, number][] }
export const ALL = 0x1ff;
export const bit = (d: number): number => 1 << (d - 1);
export const digits = (mask: number): number[] => Array.from({ length: 9 }, (_, i) => i + 1).filter(d => mask & bit(d));
export const size = (mask: number): number => digits(mask).length;
export const unitName = (u: number): string => u < 6 ? `row ${u + 1}` : u < 12 ? `column ${u - 5}` : `region ${u - 11}`;
export function createModel(layout: readonly boolean[]): Model {
  if (layout.length !== 36) throw new Error('Expected 36 cells.');
  const slots: Slot[] = [], units: number[][] = Array.from({ length: 18 }, () => []), pairs: [number, number][] = [];
  layout.forEach((split, cell) => {
    const r = Math.floor(cell / 6), c = cell % 6;
    const memberships = [r, 6 + c, 12 + Math.floor(r / 2) * 2 + Math.floor(c / 3)];
    const first = slots.length;
    for (let half = 0; half < (split ? 2 : 1); half++) {
      const index = slots.length;
      slots.push({ cell, half, units: memberships, name: `r${r + 1}c${c + 1}${split ? half === 0 ? ' above the slash' : ' below the slash' : ''}` });
      memberships.forEach(u => units[u].push(index));
    }
    if (split) pairs.push([first, first + 1]);
  });
  if (units.some(u => u.length !== 9)) throw new Error('Each row, column and region must have nine digit positions.');
  const peers = slots.map((s, i) => [...new Set(s.units.flatMap(u => units[u]))].filter(p => p !== i));
  return { slots, units, peers, pairs };
}
export function initialMasks(model: Model, values: readonly (readonly number[])[]): number[] {
  const masks = model.slots.map(s => values[s.cell]?.[s.half] ? bit(values[s.cell][s.half]) : ALL);
  model.slots.forEach((s, i) => {
    if (values[s.cell]?.[s.half]) model.peers[i].forEach(p => {
      if (!values[model.slots[p].cell]?.[model.slots[p].half]) masks[p] &= ~masks[i];
    });
  });
  return masks;
}
/** Constraint propagation used for consistency checks and forcing proofs, not solution lookup. */
export function propagate(model: Model, masks: number[]): string | null {
  let changed = true;
  while (changed) {
    changed = false;
    const restrict = (s: number, mask: number): void => { if (masks[s] !== mask) { masks[s] = mask; changed = true; } };
    for (let s = 0; s < masks.length; s++) {
      if (!masks[s]) return `${model.slots[s].name} has no possible digit`;
      if (size(masks[s]) === 1) for (const p of model.peers[s]) {
        if (masks[p] & masks[s]) restrict(p, masks[p] & ~masks[s]);
      }
    }
    for (const [a, b] of model.pairs) {
      const upper = digits(masks[a]), lower = digits(masks[b]);
      restrict(a, upper.filter(x => lower.some(y => x < y)).reduce((m, d) => m | bit(d), 0));
      restrict(b, lower.filter(y => upper.some(x => x < y)).reduce((m, d) => m | bit(d), 0));
    }
    for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
      const possible = model.units[u].filter(s => masks[s] & bit(d));
      if (!possible.length) return `${unitName(u)} has no place for ${d}`;
      if (possible.length === 1) restrict(possible[0], bit(d));
    }
  }
  return masks.some(m => !m) ? 'a digit position has no candidates' : null;
}
export function hasCompletion(model: Model, input: readonly number[]): boolean {
  return findCompletion(model, input) !== null;
}
/** Backtracking fallback returns its own completion, never the displayed answer. */
export function findCompletion(model: Model, input: readonly number[]): number[] | null {
  const masks = [...input];
  if (propagate(model, masks)) return null;
  let next = -1;
  for (let i = 0; i < masks.length; i++) if (size(masks[i]) > 1 && (next < 0 || size(masks[i]) < size(masks[next]))) next = i;
  if (next < 0) return masks.map(m => digits(m)[0]);
  for (const d of digits(masks[next])) {
    const trial = [...masks]; trial[next] = bit(d);
    const completion = findCompletion(model, trial);
    if (completion) return completion;
  }
  return null;
}

/** Count actual digit-position assignments, including partially given slash pairs. */
export function countCompletions(model: Model, input: readonly number[], limit = 2): number {
  const masks = [...input];
  if (propagate(model, masks)) return 0;
  let next = -1;
  for (let i = 0; i < masks.length; i++) if (size(masks[i]) > 1 && (next < 0 || size(masks[i]) < size(masks[next]))) next = i;
  if (next < 0) return 1;
  let count = 0;
  for (const d of digits(masks[next])) {
    const trial = [...masks]; trial[next] = bit(d);
    count += countCompletions(model, trial, limit - count);
    if (count >= limit) return limit;
  }
  return count;
}
