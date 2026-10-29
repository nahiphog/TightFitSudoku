# Tight Fit logical hints

The imported sudokUI source is pinned in `vendor/sudokui`. The adapted pattern logic is in `src/logic`, with GPL-3.0 attribution. Upstream remains unmodified.

## Variant model

Each of the 36 cells contributes one variable or two ordered variables. All 54 variables belong to one row, column, and 2×3 region. Each of the 18 units has exactly nine variables. The two halves of a slash share all three units, are peers, and satisfy upper < lower. Candidate masks use bits 0–8 for digits 1–9. Slot names always identify which half is involved.

## Enabled deductions

- Full House, Naked Single, Hidden Single.
- Tight Fit slash-order filtering, including partially entered pairs.
- Locked Candidates across unit intersections, including both split halves.
- Naked, Hidden, and Locked Pairs/Triples; Naked/Hidden Quadruples.
- X-Wing, Swordfish, Jellyfish using slot sets at row/column intersections.
- Finned fish of sizes 2–4, with targets required to see every fin; this handles sashimi configurations without assuming a 3×3 fin box.
- XY-Wing and XYZ-Wing using actual variable peers.
- Alternating Inference Chains built from bivalue positions, conjugate unit links, peer exclusions, and incompatible slash pairs. The general graph can express deductions also encountered as coloring, X/XY chains, wings, and single-digit patterns; hints use the actual chain explanation rather than claiming a more specific pattern name.
- ALS-XZ with disjoint almost-locked sets of up to three positions.
- Candidate forcing contradictions using fixed-digit propagation, unit singles, and slash-order filtering. A hint names the assumed candidate and the contradiction it causes.

## Deliberate limits

This is a sound adaptation of applicable technique families, not a claim that every upstream named technique has been ported. Standard 9×9-specific Unique/Extended/Avoidable Rectangles, BUG+1, Exocet/Double Exocet, chute-specific patterns, Tridagon, complex/grouped fish, grouped loops, larger ALS chains, Death Blossom, Sue de Coq and forcing nets are not directly enabled. Their structural/uniqueness assumptions need separate Tight Fit proofs. Squirmbag, Whale and Leviathan are not enabled on the six-row layout. The generic chains may find some equivalent deductions, without pretending to implement these named techniques.

If no enabled technique yields a step, Hint explicitly reports that it is stuck. It does not reveal an answer or label a guess as logic.

## Hint contract

Hint reads current givens, user entries, and previously applied candidate eliminations. It never reads the completed grid. It first checks whether those constraints admit a completion, then searches from easy deductions to more complex ones. Before displaying any deduction, an independent backtracking constraint check verifies it: a proposed eliminated candidate must admit no completion, and excluding a proposed placement must admit no completion. This verification does not supply the step or its explanation.

Asking for a hint does not change entries. Apply placement writes only the hinted empty half/cell. Apply candidate elimination saves the reduction for the next Hint. Manual editing resets accumulated reductions to avoid carrying deductions from an obsolete entry state. Generate resets everything. Worker request IDs discard obsolete results after edits or generation.

## Verification

`npm test` checks generation/digging, repeated logical solve paths, wrong entries, partially filled slash pairs, solved states, and pattern-finder deductions against an independent completion search. It also verifies that no hint request edits the supplied entries.

## Licensing

Adapted logic derives from GPL-3.0 sudokUI. Original license and attribution are retained. The app includes the GPL text and a matching downloadable source archive built by `scripts/package-source.mjs`. The archive includes the app sources, imported upstream snapshot, tests, configuration, and build instructions; it excludes credentials and hosting identity.
