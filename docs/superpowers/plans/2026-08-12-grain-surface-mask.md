# Grain Surface Mask Implementation Plan

Verification tier: renderer/canvas/runtime scope

Reason: a conditional product control changes the WebGL field-shader output while reusing the existing raymarch pass.

## Product behavior

- Add `Grain Distribution` with `Screen` and `Surface mask` options.
- `Screen` preserves the current Paper Grain 2D overlay.
- `Surface mask` keeps Paper Grain coordinates in `gl_FragCoord`, but multiplies its visibility by a normalized mask derived from the already accumulated 3D wave surface.
- Keep `Area` as an additional wave-region mask.
- Show the control only when `Effect = Grain Gradient` and `Distribution = Inside`; Border has no 3D raymarched surface.

## Implementation

- Extend `dispersion-values.ts` with the target, type, default, validation, and settings reader.
- Split the eleven Effect controls into balanced `Effect Placement` and `Effect Style` sections in `dispersion-schema-sections.ts`, preserving the same product entity.
- Add one field-only uniform through `dispersion-webgl.ts` and apply it in `dispersion-shaders.ts`; Border continues to use flat screen distribution.
- Include the target in renderer invalidation, persistence versioning, acceptance inventory, verification ownership, and the product worklog.

## Verification

- Add unit assertions for default/fallback settings, section inventory, and conditional applicability.
- Add browser proof that the control is visible only for Grain + Inside, changes canvas pixels between Screen and Surface mask, persists across reload, and remains absent in Border.
- Run targeted type/unit/browser checks, then one `npm run verify:delivery`; do not run measured performance because the request is functional.
