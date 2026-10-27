# Realistic Grain Surface Distribution

## Goal

Make `Grain Distribution = Surface` read as an undistorted two-dimensional Paper Grain layer whose density follows the projected 3D light sheet. Remove synthetic terrain islands, crest-only bias, and brightness replacement while preserving the official Paper noise recipe, grain scale, animation, selected Area, timeline, preview, and image export.

## Implementation

1. In `src/app/dispersion/dispersion-light-sheet-core.ts`, replace the noisy weighted-position relief map with a continuous exposure-style projection of the existing raymarch hit accumulator.
2. Keep `uGrainAmount` as the only input to Paper's grain density and color calculation. Apply the Surface projection once to final grain opacity, leaving `grain_uv` in output-pixel space so individual grains never bend.
3. Preserve the current source-over composite for Screen. Composite Surface as non-darkening spectral emission so grains add light without flattening or replacing the HDR caustic.
4. Update the focused shader contract assertions in `src/app/dispersion/dispersion-product.test.ts` and record the product decision in `docs/toolcraft/agent-worklog.md`.

No schema control, section inventory, timeline, layer, persistence, settings-transfer, renderer pass, workload envelope, preview/export ownership, or verification-impact mapping changes are required.

## Verification

Verification scope: renderer/canvas/runtime feature.

Run the focused TypeScript and product tests, the existing browser acceptance for `effect.grain.distribution`, and compare fixed Screen and Surface screenshots in a real browser. Finish with one bare delivery verification and leave the local dev server running.

Measured performance is not requested because the correction replaces constant scalar shader math inside the existing fixed-cost pass.
