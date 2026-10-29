import { createModel, initialMasks, hasCompletion, digits, bit } from './board';
import { nextLogicalStep } from './catalog';
import type { Step } from './techniques';

export interface HintResult { status: 'step' | 'conflict' | 'solved' | 'stalled'; message: string; masks: number[]; step?: Step; targets: { slot: number; cell: number; half: number; name: string; candidates: number[] }[] }
export function getHint(layout: boolean[], values: number[][], restrictions?: number[], enabled?: readonly string[]): HintResult {
  const model = createModel(layout);
  const entered = model.slots.map(s => values[s.cell]?.[s.half] ?? 0);
  const masks = initialMasks(model, values).map((mask, s) => mask & (restrictions?.[s] ?? 0x1ff));
  const result = (status: HintResult['status'], message: string, step?: Step): HintResult => ({ status, message, masks, step, targets: [...new Set([...(step?.focus ?? []), ...(step?.placements ?? []).map(p => p.slot), ...(step?.removals ?? []).map(p => p.slot)])].map(slot => ({ slot, cell: model.slots[slot].cell, half: model.slots[slot].half, name: model.slots[slot].name, candidates: digits(masks[slot]) })) });
  if (!hasCompletion(model, masks)) return result('conflict', 'Your current entries cannot be completed under the Tight Fit rules. Correct or clear an entry before asking for a logical hint.');
  if (entered.every(Boolean)) return result('solved', 'Solved! All rows, columns, regions and slash pairs are valid.');
  // Prefer easy placements, then the variant constraint, then imported pattern families.
  const step = nextLogicalStep(model, masks, entered, enabled);
  if (!step) return result('stalled', 'No next step was found by the adapted logical techniques. Your entries are consistent. No guess or completed-grid answer has been substituted.');
  // A candidate implication is checked independently against all variant constraints.
  // Verification rejects faulty pattern deductions rather than exposing an unsound hint.
  for (const removal of step.removals) {
    const trial = [...masks]; trial[removal.slot] = bit(removal.digit);
    if (hasCompletion(model, trial)) throw new Error('Hint deduction failed soundness verification.');
  }
  for (const placement of step.placements) {
    const trial = [...masks]; trial[placement.slot] &= ~bit(placement.digit);
    if (hasCompletion(model, trial)) throw new Error('Hint placement failed soundness verification.');
  }
  return result('step', step.explanation, step);
}
