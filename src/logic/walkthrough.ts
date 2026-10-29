import { createModel, initialMasks, bit } from './board';
import { getHint } from './hints';
import { bruteForce, techniqueInfo, difficulty } from './catalog';
import type { Level } from './catalog';
import type { Step } from './techniques';
import { checkGrid } from '../check';
export interface Frame { values: number[][]; masks: number[]; step: Step | null; points: number; cumulative: number }
export interface Walkthrough { frames: Frame[]; rating: number; level: Level; hardest: string; bruteUses: number }

/** Replay starts at the original givens; it has no access to the displayed answer. */
export function buildWalkthrough(layout: boolean[], puzzle: number[][], enabled?: readonly string[]): Walkthrough {
  const model = createModel(layout);
  const values = puzzle.map((digits, cell) => digits.length ? [...digits] : Array<number>(layout[cell] ? 2 : 1).fill(0));
  let masks = initialMasks(model, values), rating = 0;
  const frames: Frame[] = [{ values: values.map(d => [...d]), masks: [...masks], step: null, points: 0, cumulative: 0 }];
  const names: string[] = [];
  for (let turn = 0; turn < 600; turn++) {
    const hint = getHint(layout, values, masks, enabled);
    if (hint.status === 'conflict') throw new Error('Walkthrough constraints are inconsistent.');
    if (hint.status === 'solved') {
      if (!checkGrid(layout, values).solved) throw new Error('Final walkthrough grid failed validation.');
      const hardest = names.length ? names.reduce((a, b) => techniqueInfo(a).score >= techniqueInfo(b).score ? a : b) : 'None';
      return { frames, rating, level: difficulty(rating, names), hardest, bruteUses: names.filter(n => n === 'Brute Force').length };
    }
    // Only a genuine logical stall may invoke backtracking. Each use places one digit.
    const step = hint.step ?? bruteForce(model, hint.masks, model.slots.map(s => values[s.cell][s.half]));
    if (!step) throw new Error('No valid completion found for walkthrough.');
    masks = [...hint.masks];
    let progress = false;
    for (const removal of step.removals) {
      if (masks[removal.slot] & bit(removal.digit)) progress = true;
      masks[removal.slot] &= ~bit(removal.digit);
    }
    for (const placement of step.placements) {
      const target = model.slots[placement.slot];
      if (values[target.cell][target.half]) throw new Error('A walkthrough step attempted to replace an entry.');
      values[target.cell][target.half] = placement.digit;
      masks[placement.slot] = bit(placement.digit);
      progress = true;
    }
    if (!progress) throw new Error('Walkthrough step made no progress.');
    masks = initialMasks(model, values).map((mask, s) => mask & masks[s]);
    const points = techniqueInfo(step.technique).score;
    rating += points; names.push(step.technique);
    frames.push({ values: values.map(d => [...d]), masks: [...masks], step, points, cumulative: rating });
  }
  throw new Error('Walkthrough exceeded the candidate reduction bound.');
}
