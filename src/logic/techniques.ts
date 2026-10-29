/**
 * Tight Fit adaptations of sudokUI's technique families (GPL-3.0).
 * Upstream: AImenes/sudokUI, revision 1f7831c6dc0fa118e1c7638e61c99756b1fa9d48.
 * Reworked for 54 variables, 18 nine-position units, and ordered slash pairs.
 * See vendor/sudokui/LICENSE and docs/techniques.md for provenance and coverage.
 */
import { bit, digits, size, unitName } from './board';
import type { Model } from './board';
export interface Removal { slot: number; digit: number }
export interface Step { technique: string; explanation: string; placements: Removal[]; removals: Removal[]; focus: number[] }
export function combinations<T>(items: readonly T[], n: number): T[][] {
  if (!n) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), n - 1).map(rest => [item, ...rest]));
}
const union = (a: number[]): number => a.reduce((x, y) => x | y, 0);
function elimination(technique: string, explanation: string, removals: Removal[], focus: number[]): Step | null {
  return removals.length ? { technique, explanation, placements: [], removals, focus } : null;
}
export function slashOrder(model: Model, masks: number[], wanted?: string): Step | null {
  for (const [a, b] of model.pairs) {
    const removals = [a, b].flatMap(s => digits(masks[s]).filter(d => !digits(masks[s === a ? b : a]).some(other => s === a ? d < other : other < d)).map(digit => ({ slot: s, digit })));
    const step = elimination('Slash order', `In ${model.slots[a].name.replace(' above the slash', '')}, the upper digit must be smaller than the lower digit. The upper possibilities are {${digits(masks[a])}} and the lower possibilities are {${digits(masks[b])}}. Remove values that have no compatible partner.`, removals, [a, b]);
    if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
  }
  return null;
}
export function singles(model: Model, masks: number[], entered: number[], wanted?: string): Step | null {
  for (let s = 0; s < masks.length; s++) if (!entered[s] && size(masks[s]) === 1) {
    const digit = digits(masks[s])[0];
    const full = model.slots[s].units.find(u => model.units[u].filter(p => !entered[p]).length === 1);
    if (wanted && wanted !== (full === undefined ? 'Naked Single' : 'Full House')) continue;
    return { technique: full === undefined ? 'Naked Single' : 'Full House', explanation: full === undefined ? `${model.slots[s].name} has only one remaining candidate: ${digit}. Other digits are excluded by its row, column, region, or slash partner.` : `${unitName(full)} has just one empty digit position. Its missing digit is ${digit}, so place it in ${model.slots[s].name}.`, placements: [{ slot: s, digit }], removals: [], focus: [s] };
  }
  for (let u = 0; u < 18; u++) for (let d = 1; d <= 9; d++) {
    const cells = model.units[u].filter(s => masks[s] & bit(d));
    if (cells.length === 1 && !entered[cells[0]] && (!wanted || wanted === 'Hidden Single')) return { technique: 'Hidden Single', explanation: `In ${unitName(u)}, ${d} can go only in ${model.slots[cells[0]].name}. Both halves of a slashed cell count as separate digit positions.`, placements: [{ slot: cells[0], digit: d }], removals: [], focus: cells };
  }
  return null;
}
export function intersections(model: Model, masks: number[], wanted?: string): Step | null {
  for (let a = 0; a < 18; a++) for (let b = 0; b < 18; b++) {
    if (a === b || !model.units[a].some(s => model.units[b].includes(s))) continue;
    for (let d = 1; d <= 9; d++) {
      const sources = model.units[a].filter(s => masks[s] & bit(d));
      if (sources.length < 2 || !sources.every(s => model.units[b].includes(s))) continue;
      const removals = model.units[b].filter(s => !model.units[a].includes(s) && masks[s] & bit(d)).map(slot => ({ slot, digit: d }));
      const step = elimination('Locked Candidates', `${d} in ${unitName(a)} is confined to its intersection with ${unitName(b)} (${sources.map(s => model.slots[s].name).join(', ')}). Therefore ${d} cannot appear elsewhere in ${unitName(b)}.`, removals, sources);
      if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
    }
  }
  return null;
}
export function subsets(model: Model, masks: number[], wanted?: string): Step | null {
  const names = ['', '', 'Pair', 'Triple', 'Quadruple'];
  for (let n = 2; n <= 4; n++) for (let u = 0; u < 18; u++) {
    const cells = model.units[u].filter(s => size(masks[s]) > 1);
    for (const group of combinations(cells.filter(s => size(masks[s]) <= n), n)) {
      const mask = union(group.map(s => masks[s]));
      if (size(mask) !== n) continue;
      const shared = model.slots[group[0]].units.filter(unit => group.every(s => model.units[unit].includes(s)));
      const targets = [...new Set(shared.flatMap(unit => model.units[unit]))];
      const removals = targets.filter(s => !group.includes(s)).flatMap(slot => digits(masks[slot] & mask).map(digit => ({ slot, digit })));
      const step = elimination(`${shared.length > 1 ? 'Locked' : 'Naked'} ${names[n]}`, `${group.map(s => model.slots[s].name).join(', ')} contain exactly the ${n} candidates {${digits(mask)}} in ${unitName(u)}. Those digits occupy these ${n} positions, so remove them from other positions in their shared units.`, removals, group);
      if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
    }
    const candidates = digits(union(cells.map(s => masks[s])));
    for (const group of combinations(candidates, n)) {
      const mask = union(group.map(bit));
      const positions = cells.filter(s => masks[s] & mask);
      if (positions.length !== n) continue;
      const removals = positions.flatMap(slot => digits(masks[slot] & ~mask).map(digit => ({ slot, digit })));
      const step = elimination(`Hidden ${names[n]}`, `In ${unitName(u)}, digits {${group}} occur only in ${positions.map(s => model.slots[s].name).join(', ')}. These ${n} positions must hold those ${n} digits, so remove their other candidates.`, removals, positions);
      if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
    }
  }
  return null;
}
/** Fish use sets of slots at intersections, never a fictitious 9×9 cell index. */
export function fish(model: Model, masks: number[], wanted?: string): Step | null {
  for (let n = 2; n <= 4; n++) for (const offset of [0, 6]) for (let d = 1; d <= 9; d++) {
    const bases = Array.from({ length: 6 }, (_, i) => i + offset).filter(u => {
      const slots = model.units[u].filter(s => masks[s] & bit(d));
      return slots.length > 1 && new Set(slots.map(s => model.slots[s].units[offset === 0 ? 1 : 0])).size <= n;
    });
    for (const selected of combinations(bases, n)) {
      const positions = selected.flatMap(u => model.units[u].filter(s => masks[s] & bit(d)));
      const covers = [...new Set(positions.map(s => model.slots[s].units[offset === 0 ? 1 : 0]))];
      if (covers.length !== n) continue;
      const removals = covers.flatMap(u => model.units[u]).filter(s => !selected.includes(model.slots[s].units[offset === 0 ? 0 : 1]) && masks[s] & bit(d)).map(slot => ({ slot, digit: d }));
      const name = ['', '', 'X-Wing', 'Swordfish', 'Jellyfish'][n];
      const step = elimination(name, `For digit ${d}, ${selected.map(unitName).join(', ')} are confined to ${covers.map(unitName).join(', ')}. Each base unit needs one ${d}, filling the ${n} cover units, so eliminate ${d} from the other positions in those covers. A slash intersection may contain either half.`, removals, positions);
      if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
    }
  }
  return null;
}

/** Fins need not lie in a standard 3×3 box: each target must see every fin. */
export function finnedFish(model: Model, masks: number[], wanted?: string): Step | null {
  for (let n = 2; n <= 4; n++) for (const offset of [0, 6]) for (let d = 1; d <= 9; d++) {
    const baseUnits = Array.from({ length: 6 }, (_, i) => i + offset).filter(u => model.units[u].filter(s => masks[s] & bit(d)).length > 1);
    for (const bases of combinations(baseUnits, n)) {
      const positions = bases.flatMap(u => model.units[u].filter(s => masks[s] & bit(d)));
      const covers = [...new Set(positions.map(s => model.slots[s].units[offset === 0 ? 1 : 0]))];
      if (covers.length <= n || covers.length > n + 2) continue;
      for (const chosen of combinations(covers, n)) {
        const fins = positions.filter(s => !chosen.includes(model.slots[s].units[offset === 0 ? 1 : 0]));
        if (!fins.length || bases.some(u => !model.units[u].some(s => masks[s] & bit(d) && chosen.includes(model.slots[s].units[offset === 0 ? 1 : 0])))) continue;
        const targets = chosen.flatMap(u => model.units[u]).filter(s => masks[s] & bit(d) && !bases.includes(model.slots[s].units[offset === 0 ? 0 : 1]) && fins.every(fin => model.peers[s].includes(fin)));
        const name = ['', '', 'X-Wing', 'Swordfish', 'Jellyfish'][n];
        const step = elimination(`Finned ${name}`, `For ${d}, ${bases.map(unitName).join(', ')} form a fish in ${chosen.map(unitName).join(', ')} except for fins at ${fins.map(s => model.slots[s].name).join(', ')}. Each target sees every fin. If a target were ${d}, it would remove all fins and force the fish, which would also exclude that target. Therefore remove ${d} there.`, targets.map(slot => ({ slot, digit: d })), positions);
        if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
      }
    }
  }
  return null;
}

/** ALS-XZ only uses all-different sets and visibility, so it generalizes to halves. */
export function alsXZ(model: Model, masks: number[], wanted?: string): Step | null {
  const sets: { cells: number[]; mask: number }[] = [];
  const known = new Set<string>();
  for (const unit of model.units) for (let n = 1; n <= 3; n++) {
    for (const cells of combinations(unit.filter(s => size(masks[s]) > 1 && size(masks[s]) <= n + 1), n)) {
      const mask = union(cells.map(s => masks[s]));
      const key = [...cells].sort((a, b) => a - b).join(',');
      if (size(mask) === n + 1 && !known.has(key)) { known.add(key); sets.push({ cells, mask }); }
    }
  }
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    const a = sets[i], b = sets[j], common = a.mask & b.mask;
    if (size(common) < 2 || a.cells.some(s => b.cells.includes(s))) continue;
    for (const x of digits(common)) {
      const ax = a.cells.filter(s => masks[s] & bit(x)), bx = b.cells.filter(s => masks[s] & bit(x));
      if (!ax.every(s => bx.every(t => model.peers[s].includes(t)))) continue;
      for (const z of digits(common & ~bit(x))) {
        const sources = [...a.cells, ...b.cells].filter(s => masks[s] & bit(z));
        const removals = masks.flatMap((mask, slot) => mask & bit(z) && !a.cells.includes(slot) && !b.cells.includes(slot) && sources.every(s => model.peers[slot].includes(s)) ? [{ slot, digit: z }] : []);
        const step = elimination('ALS-XZ', `Set A (${a.cells.map(s => model.slots[s].name).join(', ')}) has candidates {${digits(a.mask)}}; set B (${b.cells.map(s => model.slots[s].name).join(', ')}) has {${digits(b.mask)}}. Each set has one more candidate than positions. Their ${x} positions all see each other, so the two sets cannot both require ${x}. Consequently ${z} must occur in at least one set. Remove ${z} from positions seeing all its occurrences in both sets.`, removals, [...a.cells, ...b.cells]);
        if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
      }
    }
  }
  return null;
}
export function wings(model: Model, masks: number[], wanted?: string): Step | null {
  const bivalue = masks.flatMap((m, s) => size(m) === 2 ? [s] : []);
  for (let pivot = 0; pivot < masks.length; pivot++) {
    if (![2, 3].includes(size(masks[pivot]))) continue;
    const peers = bivalue.filter(s => model.peers[pivot].includes(s));
    for (const [a, b] of combinations(peers, 2)) {
      const common = masks[a] & masks[b];
      if (size(common) !== 1 || size(masks[a] | masks[b]) !== 3) continue;
      const xyz = size(masks[pivot]) === 3;
      if (xyz ? (masks[a] | masks[b]) !== masks[pivot] : (masks[a] ^ masks[b]) !== masks[pivot]) continue;
      const sources = xyz ? [pivot, a, b] : [a, b];
      const removals = masks.flatMap((mask, slot) => ![pivot, a, b].includes(slot) && mask & common && sources.every(s => model.peers[s].includes(slot)) ? [{ slot, digit: digits(common)[0] }] : []);
      const step = elimination(xyz ? 'XYZ-Wing' : 'XY-Wing', `Pivot ${model.slots[pivot].name} {${digits(masks[pivot])}} sees wings ${model.slots[a].name} {${digits(masks[a])}} and ${model.slots[b].name} {${digits(masks[b])}}. Whichever pivot value is used, ${xyz ? 'the pivot or one wing' : 'one wing'} must be ${digits(common)[0]}. Remove it from positions seeing ${xyz ? 'all three' : 'both wings'}.`, removals, [pivot, a, b]);
      if (step && (typeof wanted === 'undefined' || step.technique === wanted)) return step;
    }
  }
  return null;
}

