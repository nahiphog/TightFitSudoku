# Tight Fit Sudoku

A TypeScript maker for 6×6 Tight Fit Sudoku. Each layout has three slashes per row, column, and 2×3 region. Completed grids contain 1–9 once per unit, with smaller digits above each slash.

Generate displays a completed grid and a dug puzzle. Digging locks both clues in every slashed cell and tests unslashed cells in random order, removing a clue only when exactly one solution remains. The result is minimal among individual unslashed clues. Generation runs in a Web Worker.

The 9×9 generator uses 3×3 regions and exactly one slashed cell per row, column, and region. Each unit contains 0–9, and the same locked-clue digging rule applies. Custom Build remains a manual clue editor for the 6×6 version.

Run `npm install` then `npm run dev`. Build with `npm run build`.

Run `npm test` (Node 22.6+ with TypeScript stripping) to verify solution counting, Sudoku constraints, uniqueness, and that removing any remaining given cell creates multiple solutions.


## Logical hints

Hint uses your current entries to explain the next deduction, including separate slash halves. Apply step is optional. Manual edits recalculate candidates. The adapted engine covers singles, slash order, intersections, subsets, fish/finned fish, wings, inference chains, ALS-XZ and forcing contradictions; see [coverage and limits](docs/techniques.md). Standard 9×9 geometry-specific techniques remain disabled pending proofs for Tight Fit. The completed grid is never used as a hint source.

This application includes GPL-3.0 adaptations of AImenes/sudokUI; see LICENSE and vendor/README.md. Build generates a matching source download in public/. Node 24+ and tar are needed for the full build and test workflow.



## Solution walkthrough

Each generation also records a solution replay from its original givens. Use <<, <, >, >>, the range slider, or the Technique/Step table to browse the immutable snapshots. Scores come from src/logic/catalog.ts; Brute Force is the final callable fallback and adds +10,000 per one-position placement. The /techniques/ page lists all 25 active callable techniques and their scores. Vite builds both pages through vite.config.mjs. Browsing the walkthrough never changes playable entries.

## Custom build

Open `/custom-build/`, select exact whole-cell clue positions, choose a difficulty range, and press Build now. The worker searches for a unique puzzle using the displayed fixed slash layout. Halt build stops the search. Results include ratings, the solution walkthrough, JSON clipboard export (with slash layout), and PNG export. See [custom builder behavior](docs/custom-build.md). Vite builds all three pages through vite.config.mjs.

