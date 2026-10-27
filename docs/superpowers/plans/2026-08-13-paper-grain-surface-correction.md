# Paper Grain surface correction

## Request

Make Paper Grain visibly denser, stop treating its surface distribution as a flat overlay, and make Screen and Surface meaningfully different.

## Diagnosis

- Paper's `GrainGradient` exposes `noise` across the full `0..1` range and applies a `1.6` grain-domain multiplier in its patterned-shape recipe.
- Dispersion currently caps `Grain amount` at Paper `noise=0.5` and maps Scale to only `0.2..1.2`, so even the maximum control cannot reach Paper's complete amount range or its reference spatial frequency.
- Both Dispersion distributions currently build `grain_uv` from `fragCoord`; `Surface mask` changes only the coverage mask, so its grains remain screen-space and closely resemble `Screen`.

## Product decision

- Keep the existing controls and target ids.
- Map `Grain amount` linearly to Paper's complete `0..1` noise range.
- Make Scale resolution-independent and Paper-like: the midpoint uses Paper's `1.6` patterned-grain multiplier, with a useful coarse-to-fine range around it.
- The grain field stays in normalized screen coordinates in both distributions, so individual grains do not stretch, bend, or change shape with perspective.
- `Screen` applies that stable field uniformly inside the selected Area. `Surface` uses raymarched sheet confidence and height as a 3D density/brightness map, so the stable grains occupy the wave's relief instead of behaving like a flat overlay.
- Preserve Paper's pinned noise kernel, shape recipe, spectral color mixing, quality, timeline, export, persistence, and Lens Distortion pipeline.

## Files

- `src/app/dispersion/dispersion-paper-grain.ts`: correct Paper parameter mapping and expose tested domain-scale helpers.
- `src/app/dispersion/dispersion-light-sheet-core.ts`: keep one undistorted screen-space grain field and apply a stronger raymarched 3D distribution map in Surface mode.
- `src/app/dispersion/dispersion-effects-schema.ts`: rename `Surface mask` to `Surface` and describe real coordinate behavior.
- `src/app/dispersion/dispersion-effects-acceptance.ts`, `e2e/dispersion-control-proof.ts`: require distinct planar and surface-bound outcomes.
- focused product tests, verification impact inventory, and `docs/toolcraft/agent-worklog.md`: record and prove the changed semantics.

## Verification

- Targeted unit tests for full amount range, Paper midpoint scale, resolution independence, undistorted grain coordinates, and distinct screen/surface distribution branches.
- Targeted browser acceptance for Grain Amount, Scale, and Distribution.
- One bare `npm run verify:delivery` at the coherent delivery boundary.
- No measured performance run: this batch corrects visual behavior without changing workload bounds, sample counts, render backing, or pass topology.
