# Imported sudokUI source

Source: https://github.com/AImenes/sudokUI

Pinned revision: `1f7831c6dc0fa118e1c7638e61c99756b1fa9d48`

The `sudokui/` directory is an unmodified snapshot of all tracked upstream files, including every technique implementation in `src/engine/techniques/`, the technique catalogue and solve order in `src/engine/ratings.ts`, the human solver, supporting board and candidate logic, documentation, and upstream tests.

The upstream GPL-3.0 license is preserved in `sudokui/LICENSE`. Original attribution and source notices are retained.

Import status: the unmodified upstream snapshot is retained. Adapted, verified technique families now power the live Hint feature via `src/logic/`. See `docs/techniques.md` for exact coverage and limits. Upstream assumes 81 single-digit cells, 27 units, and 3×3 boxes; Tight Fit has 36 cells, 54 digit positions, 18 units, 2×3 regions, and ordered slash pairs. Geometry-specific techniques without a valid Tight Fit proof remain disabled.

The existing Tight Fit generation, digging, and Check behavior continues to use its own variant-aware code. The app TypeScript build excludes this standalone vendor snapshot, which retains its own upstream package configuration and test suite.
