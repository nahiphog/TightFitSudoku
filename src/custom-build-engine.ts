import { solveGrid, countSolutions } from './solver';
import { buildWalkthrough } from './logic/walkthrough';
import type { Walkthrough } from './logic/walkthrough';
import { createModel } from './logic/board';
import { slashCounts } from './slash-layout';

export interface BuildRequest { layout: boolean[]; selected: number[]; minimum: number; maximum: number }
export interface BuildResult { layout: boolean[]; puzzle: number[][]; walkthrough: Walkthrough }
export function validateBuild(request: BuildRequest): string | null {
  if (!slashCounts(request.layout).valid) return 'Place exactly three slashes in every row, column and 2 × 3 region before building.';
  try { createModel(request.layout); } catch { return 'Use a valid slash layout with three slashes in every row, column and region.'; }
  if (!request.selected.length) return 'Highlight at least one clue cell before building.';
  if (request.selected.some(i => !Number.isInteger(i) || i < 0 || i > 35)) return 'Clue positions must be cells in the 6 × 6 grid.';
  if (!Number.isFinite(request.minimum) || !Number.isFinite(request.maximum) || request.minimum < 0 || request.maximum < request.minimum) return 'Choose a nonnegative minimum rating that is no higher than the maximum.';
  return null;
}
/** One independent attempt; never adds clues outside the chosen whole-cell pattern. */
export function buildAttempt(request: BuildRequest): { result: BuildResult | null; unique: boolean; rating?: number } {
  const error = validateBuild(request);
  if (error) throw new Error(error);
  const completed = solveGrid(request.layout);
  if (!completed) throw new Error('This slash layout has no completed grid. Choose a new layout.');
  const selected = new Set(request.selected);
  const puzzle = completed.map((digits, i) => selected.has(i) ? [...digits] : []);
  if (countSolutions(request.layout, puzzle) !== 1) return { result: null, unique: false };
  const walkthrough = buildWalkthrough(request.layout, puzzle);
  const rating = walkthrough.rating;
  return { result: rating >= request.minimum && rating <= request.maximum ? { layout: [...request.layout], puzzle, walkthrough } : null, unique: true, rating };
}
