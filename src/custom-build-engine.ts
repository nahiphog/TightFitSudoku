import { solveGrid, countSolutions } from './solver';
import { buildWalkthrough } from './logic/walkthrough';
import type { Walkthrough } from './logic/walkthrough';
import { createModel } from './logic/board';
import { slashCounts } from './slash-layout';

export interface BuildRequest { layout: boolean[]; selected: number[]; selectedDigits?: number[]; minimum: number; maximum: number }
export interface BuildResult { layout: boolean[]; puzzle: number[][]; walkthrough: Walkthrough }
export function validateBuild(request: BuildRequest): string | null {
  if (!slashCounts(request.layout).valid) return 'Place exactly three slashes in every row, column and 2 × 3 region before building.';
  try { createModel(request.layout); } catch { return 'Use a valid slash layout with three slashes in every row, column and region.'; }
  if (request.selectedDigits) {
    if (!request.selectedDigits.length) return 'Highlight at least one clue digit before building.';
    if (request.selectedDigits.some(key => !Number.isInteger(key) || key < 0 || key >= 72 || (key % 2 === 1 && !request.layout[Math.floor(key / 2)]))) return 'Choose valid digit positions in the grid.';
  } else if (!request.selected.length) return 'Highlight at least one clue cell before building.';
  if (request.selected.some(i => !Number.isInteger(i) || i < 0 || i > 35)) return 'Clue positions must be cells in the 6 × 6 grid.';
  if (!Number.isFinite(request.minimum) || !Number.isFinite(request.maximum) || request.minimum < 0 || request.maximum < request.minimum) return 'Choose a nonnegative minimum rating that is no higher than the maximum.';
  return null;
}
/** One independent attempt; preserve exactly the selected cells or digit positions. */
export function buildAttempt(request: BuildRequest): { result: BuildResult | null; unique: boolean; rating?: number } {
  const error = validateBuild(request);
  if (error) throw new Error(error);
  const completed = solveGrid(request.layout);
  if (!completed) throw new Error('This slash layout has no completed grid. Choose a new layout.');
  const selected = new Set(request.selected);
  const chosenDigits = request.selectedDigits ? new Set(request.selectedDigits) : undefined;
  const puzzle = completed.map((digits, i) => {
    if (!chosenDigits) return selected.has(i) ? [...digits] : [];
    const clues = digits.map((digit, half) => chosenDigits.has(i * 2 + half) ? digit : 0);
    return clues.some(Boolean) ? clues : [];
  });
  if (countSolutions(request.layout, puzzle) !== 1) return { result: null, unique: false };
  const walkthrough = buildWalkthrough(request.layout, puzzle);
  const rating = walkthrough.rating;
  return { result: rating >= request.minimum && rating <= request.maximum ? { layout: [...request.layout], puzzle, walkthrough } : null, unique: true, rating };
}
