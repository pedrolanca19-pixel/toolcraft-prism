# Imported Settings Defaults Implementation Plan

**Goal:** Make the product defaults match `/Users/kusnizza/Downloads/dispersion-studio-settings.json` without treating transient workspace playback state as a product default.

**Verification tier: Tier 2**

Reason: This changes schema-backed product defaults and reset/fallback behavior, but does not change renderer structure, control inventory, export behavior, or workload bounds.

Run: `npm run typecheck` and the focused `src/app/dispersion/dispersion-product.test.ts` plus `src/app/app-schema.test.ts` Vitest files.

Skip: `npm run verify:delivery`, full browser acceptance, export verification, and performance suites because the user explicitly requested no strong checks and the renderer/workload model is unchanged.

## Tasks

1. Update the six imported values that differ from the current product defaults:
   - Refraction `36`
   - Effect area `all`
   - Lens dispersion shift `0.11`
   - Spectrum `prism`
   - Saturation/intensity `86`
   - Glow `43`
2. Keep the existing canvas, timeline duration/loop policy, export settings, masks, and all already-matching product defaults unchanged.
3. Do not convert `timeline.currentTimeSeconds`, `isPlaying`, or panel expansion state into product defaults; they are workspace-session state.
4. Update focused default/fallback expectations in the product test.
5. Record the decision and lightweight verification in the Toolcraft worklog.
