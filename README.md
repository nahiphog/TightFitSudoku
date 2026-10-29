# Tight Fit Sudoku

A TypeScript maker for 6×6 Tight Fit Sudoku. Each layout has three slashes per row, column, and 2×3 region. Completed grids contain 1–9 once per unit, with smaller digits above each slash.

Generate displays a completed grid and a dug puzzle. Digging tests all cells in random order, removes whole-cell clues only when exactly one solution remains, and retains the slash layout. The result is minimal by whole-cell removal, not necessarily the global minimum number of clues. Generation runs in a Web Worker.

Run `npm install` then `npm run dev`. Build with `npm run build`.

Run `npm test` (Node 22.6+ with TypeScript stripping) to verify solution counting, Sudoku constraints, uniqueness, and that removing any remaining given cell creates multiple solutions.


## Logical hints

Hint uses your current entries to explain the next deduction, including separate slash halves. Apply step is optional. Manual edits recalculate candidates. The adapted engine covers singles, slash order, intersections, subsets, fish/finned fish, wings, inference chains, ALS-XZ and forcing contradictions; see [coverage and limits](docs/techniques.md). Standard 9×9 geometry-specific techniques remain disabled pending proofs for Tight Fit. The completed grid is never used as a hint source.

This application includes GPL-3.0 adaptations of AImenes/sudokUI; see LICENSE and vendor/README.md. Build generates a matching source download in public/. Node 24+ and tar are needed for the full build and test workflow.

