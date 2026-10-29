/** Callable Tight Fit technique registry. Scores follow adapted sudokUI defaults. */
import { size, findCompletion } from './board';
import type { Model } from './board';
import { singles, slashOrder, intersections, subsets, fish, wings, finnedFish, alsXZ } from './techniques';
import type { Step } from './techniques';
import { chains, forcing } from './chains';
export type Level = 'Easy' | 'Medium' | 'Hard' | 'Unfair' | 'Extreme' | 'Brute Force';
export interface Technique {
  name: string; score: number; level: Level; category: string; description: string;
  find: (model: Model, masks: number[], entered: number[]) => Step | null;
}
const pattern = (finder: (m: Model, c: number[], wanted?: string) => Step | null, name: string) => (m: Model, c: number[]) => finder(m, c, name);
const single = (name: string) => (m: Model, c: number[], e: number[]) => singles(m, c, e, name);
const entry = (name: string, score: number, level: Level, category: string, description: string, find: Technique['find']): Technique => ({ name, score, level, category, description, find });
export function bruteForce(model: Model, masks: number[], entered: number[]): Step | null {
  const candidates = masks.map((mask, slot) => ({ slot, count: size(mask) })).filter(p => !entered[p.slot]).sort((a, b) => a.count - b.count);
  if (!candidates.length) return null;
  const completion = findCompletion(model, masks);
  if (!completion) return null;
  const slot = candidates[0].slot, digit = completion[slot];
  return { technique: 'Brute Force', explanation: `No active logical technique can progress. Backtracking searches the current candidates and finds a valid completion. Place ${digit} in ${model.slots[slot].name}. This is a search-based step, not a logical deduction, and adds 10,000 difficulty points.`, placements: [{ slot, digit }], removals: [], focus: [slot] };
}
export const TECHNIQUES: Technique[] = [
  entry('Full House', 4, 'Easy', 'Singles', 'Fill the only missing digit position in a row, column or region.', single('Full House')),
  entry('Naked Single', 4, 'Easy', 'Singles', 'Place the only candidate left in a cell or slash half.', single('Naked Single')),
  entry('Hidden Single', 14, 'Easy', 'Singles', 'A digit has only one possible position in a unit.', single('Hidden Single')),
  entry('Slash order', 10, 'Easy', 'Tight Fit', 'Remove candidates with no smaller upper or larger lower partner.', (m, c) => slashOrder(m, c)),
  entry('Locked Candidates', 50, 'Medium', 'Intersections', 'Candidates confined to a unit intersection exclude that digit elsewhere in the intersecting unit.', (m, c) => intersections(m, c)),
  ...(['Locked Pair', 'Locked Triple', 'Naked Pair', 'Naked Triple', 'Hidden Pair', 'Hidden Triple', 'Naked Quadruple', 'Hidden Quadruple'] as const).map((name, i) => entry(name, [40, 60, 60, 80, 70, 100, 120, 150][i], i < 6 ? 'Medium' : 'Hard', 'Subsets', name.startsWith('Hidden') ? 'A set of digits appears only in the same number of positions; remove other candidates from those positions.' : 'A set of positions holds the same number of digits; exclude those digits from other positions in shared units.', pattern(subsets, name))),
  ...(['X-Wing', 'Swordfish', 'Jellyfish'] as const).map((name, i) => entry(name, [140, 150, 160][i], 'Hard', 'Fish', `${i + 2} base rows or columns confine a digit to the same number of cover units. Split halves are distinct positions at intersections.`, pattern(fish, name))),
  entry('XY-Wing', 160, 'Hard', 'Wings', 'A bivalue pivot and two pincers force a shared digit into a pincer.', pattern(wings, 'XY-Wing')),
  entry('XYZ-Wing', 180, 'Hard', 'Wings', 'A trivalue pivot and two bivalue pincers force a digit into the pattern.', pattern(wings, 'XYZ-Wing')),
  ...(['Finned X-Wing', 'Finned Swordfish', 'Finned Jellyfish'] as const).map((name, i) => entry(name, [130, 200, 250][i], i === 0 ? 'Hard' : 'Unfair', 'Finned fish', 'A target seeing every fin can lose the fish digit; valid for Tight Fit without assuming a 3×3 fin box.', pattern(finnedFish, name))),
  entry('Alternating Inference Chain', 320, 'Unfair', 'Chains', 'Follow strong and weak candidate implications, including slash-order exclusions, to prove a placement or elimination.', chains),
  entry('ALS-XZ', 300, 'Unfair', 'Almost locked sets', 'Disjoint almost-locked sets of up to three positions use a restricted common candidate to exclude another common digit.', (m, c) => alsXZ(m, c)),
  entry('Forcing contradiction', 500, 'Extreme', 'Forcing', 'An assumed candidate leads through singles, peers and slash order to an explicit contradiction.', forcing),
  entry('Brute Force', 10000, 'Brute Force', 'Last resort', 'Use backtracking only when every active logical technique returns no step. Each one-position placement costs +10,000.', bruteForce),
];
export const techniqueInfo = (name: string): Technique => {
  const technique = TECHNIQUES.find(t => t.name === name);
  if (!technique) throw new Error(`Unknown active technique: ${name}`);
  return technique;
};
export function findTechnique(name: string, model: Model, masks: number[], entered: number[]): Step | null {
  return techniqueInfo(name).find(model, masks, entered);
}
export function nextLogicalStep(model: Model, masks: number[], entered: number[], enabled?: readonly string[]): Step | null {
  for (const technique of TECHNIQUES) {
    if (technique.name === 'Brute Force' || (enabled && !enabled.includes(technique.name))) continue;
    const step = technique.find(model, masks, entered);
    if (step) return step;
  }
  return null;
}
export function difficulty(score: number, names: readonly string[]): Level {
  if (names.includes('Brute Force')) return 'Brute Force';
  const levels: Level[] = ['Easy', 'Medium', 'Hard', 'Unfair', 'Extreme'];
  let level = Math.max(0, ...names.map(name => levels.indexOf(techniqueInfo(name).level)));
  const thresholds = [800, 1000, 1600, 1800, Infinity];
  while (level < 4 && score > thresholds[level]) level++;
  return levels[level];
}
