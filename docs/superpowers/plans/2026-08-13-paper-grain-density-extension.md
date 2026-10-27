# Paper Grain density extension

## Request

At Grain Amount 100%, Scale 50%, Softness 100%, Distortion 50%, and Drift 35%, make the visible grain substantially more numerous and dense.

## Diagnosis

- `Grain amount=100` already maps to Paper's complete normalized `noise=1` input.
- The current renderer evaluates one positive-only Paper Grain field. Raising its final opacity makes existing particles stronger but cannot create independent new particles.
- Scale changes spatial frequency, not coverage, and changing it would also change the requested grain size.

## Product decision

- Keep all existing controls, defaults, targets, persistence, timeline, export, Screen/Surface distribution, and grain UV geometry.
- Preserve the current primary Paper Grain field across the full Amount range.
- In the upper half of Amount, progressively introduce two decorrelated copies of the same official Paper kernel and shape recipe using translation-only UV offsets.
- Translation preserves particle shape and size. The independent fields increase particle count instead of brightness alone.
- At Amount 50%, output remains close to the current single-field result. At Amount 100%, all three fields contribute for visibly denser coverage.

## Files

- `src/app/dispersion/dispersion-light-sheet-core.ts`: composite three translated Paper fields with amount-dependent density ramps.
- `src/app/dispersion/dispersion-product.test.ts`: require three official Paper evaluations, stable scale, translation-only offsets, and staged density ramps.
- `src/app/dispersion/dispersion-effects-schema.ts` and `dispersion-effects-acceptance.ts`: describe Amount as particle count/coverage rather than brightness only.
- `e2e/dispersion-control-proof.ts`: prove that Amount 100 increases active grain coverage over the midpoint fixture.
- `docs/toolcraft/agent-worklog.md`: record the renderer decision and verification scope.

## Verification

- Focused Vitest checks for the amount mapping and three-layer shader contract.
- Focused browser checks for Grain Amount and Distribution through real controls and canvas pixels.
- One bare `npm run verify:delivery` at the coherent delivery boundary.
- No measured performance run: the request is visual-density correction, not performance work. The renderer keeps fixed bounds and adds no user-controlled loop, pass, texture, allocation, or resolution change.
