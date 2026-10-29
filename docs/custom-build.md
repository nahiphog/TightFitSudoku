# Custom builder

The page at `/custom-build/` follows the clue-pattern workflow of the user's SquishdokuMaker custom page: choose clue positions, constrain the difficulty rating, search, halt if needed, and inspect/export a unique result and its walkthrough.

Reference inspected: https://github.com/nahiphog/SquishdokuMaker/blob/main/custom-build/index.html and its `src/custom.ts`. The reference uses a 7×7 Squishdoku board and an eight-cell selection minimum. Tight Fit keeps its own rules and does not reuse that unproven minimum.

## Tight Fit behavior

- Start with a random valid 6×6 slash layout. Each row, column and 2×3 region has exactly three slashes.
- Choose clues and Place slashes are separate modes on the same grid. In slash mode, activate a cell to add/remove its diagonal; in clue mode, activate it to toggle the whole-cell clue. Each mode has its own pressed state, while the green clue backgrounds remain visible in both modes.
- Manual slash edits are a draft: row, column and region counters show all eighteen unit totals, with below-three and above-three states. Build is disabled for any incomplete/invalid layout. Even a total of eighteen is rejected unless every unit individually has three. The worker validates the same invariant independently.
- Clear slashes starts an empty draft in slash mode. New slash layout supplies another valid starting point. Both preserve selected clue positions and invalidate previous results.
- Click or keyboard-activate cells to select their clue locations. A slashed clue always contains both sorted digits; unselected cells contain neither digit.
- New slash layout changes only the layout and retains the selected cell positions. It preserves the three-slash constraints. It invalidates any previous built result.
- Build now freezes a copy of the layout, selected positions, and inclusive minimum/maximum rating. Controls are locked while searching.
- The worker generates randomized completed grids with the fixed layout and retains only the selected whole-cell clues. It counts solutions up to two. Only uniquely solvable puzzles are rated with the shared walkthrough engine.
- A result is accepted only if its rating is inside the requested range. No clues are added outside the mask and no clues are silently removed from it.
- Searching continues until a match or Halt build. Halt terminates the worker immediately; generation IDs discard any stale result. Attempts and uniqueness/rating progress are reported. No claim is made that every selected pattern/range is feasible.
- Empty selection and invalid rating ranges are rejected without starting a search. Select all permits a complete grid, whose rating is zero.
- Changing the mask, layout or range clears the previous result, preventing stale exports and walkthroughs.
- Clipboard export is JSON containing the slash map and all clue cells, so the full variant definition is retained. PNG export draws all slashes, digits, and six region boundaries.

The generated result is a read-only puzzle with the same interactive walkthrough used on Generate. It does not modify a puzzle in another tab. Users can continue to use Generate for interactive play and hints.

Implementation: `src/custom.ts`, `src/custom.worker.ts`, and `src/custom-build-engine.ts`. Tests cover exact clue masks including split cells, valid slash layouts, uniqueness rejection, inclusive rating constraints, input validation, and walkthrough completion. Browser QA covers keyboard selection, halt/restart, results, exports, and navigation.
