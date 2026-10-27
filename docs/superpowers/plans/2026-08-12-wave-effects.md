# Wave Effects Implementation Plan

Spec: `docs/superpowers/specs/2026-08-12-wave-effects-design.md`

## Verification Note

Verification tier: broad renderer/schema scope

Reason: add a pinned dependency and extend schema, normalized state, the WebGL shader resource, animation mapping, preview/export pixels, acceptance ownership, and browser coverage.

Run: focused Vitest and TypeScript checks while editing; `pnpm ai:check`; focused Playwright effect cases against the dev server; one bare `npm run verify:delivery`; then `npm run dev` and a final real-browser smoke check.

Skip: measured performance and `npm run verify:perf`, because the request is functional product work and supplies no performance-audit authority.

## Implementation Steps

1. Pin the official Paper packages.
   - Add matching exact versions of `@paper-design/shaders-react` and `@paper-design/shaders` to `package.json` and update `pnpm-lock.yaml`.
   - Inspect the installed exports and license/notice files before integrating.

2. Add the Paper grain adapter.
   - Create `src/app/dispersion/dispersion-paper-grain.ts`.
   - Import the official exported Grain Gradient fragment source and noise texture helper.
   - Extract and validate the exact noise-function block with pinned-source markers, adapt only the GLSL texture-call spelling required by the existing shader version, and expose the snippet plus texture creation/disposal helpers.
   - Type the supported control mapping against `GrainGradientProps` from `@paper-design/shaders-react` so the integration stays aligned with the requested package API.

3. Extend normalized product state.
   - Update `src/app/dispersion/dispersion-values.ts` with effect mode/area types, new defaults and targets, strict choice/number normalization, and numeric renderer mappings.
   - Retain `dispersion.sparkle` as Sparkle Amount for saved-workspace compatibility.
   - Bump the persistence schema version in `src/app/app-schema.ts` without changing included slices.

4. Recompose controls by entity.
   - Remove Sparkle from `Dispersion Field` in `src/app/dispersion/dispersion-schema-sections.ts`.
   - Add the ten-control `Effects` section using built-in selects/sliders, exact conditional applicability, semantic groups, defaults, descriptions, and responsiveness metadata.
   - Keep timeline, layers, background, image export, and panel actions unchanged.

5. Integrate both effect branches into the canonical renderer.
   - Update `src/app/dispersion/dispersion-shaders.ts` to inject the official Paper noise block, compute five optical region masks, preserve the existing surface-bound Sparkle look at its defaults, and composite Paper Grain as a flat output-pixel overlay over the selected mask. Grain coordinates must not use raymarch/world/camera coordinates.
   - Extract Paper's full grain-to-shape recipe in addition to its noise kernel, then feed Paper's `totalShape` and `mixer` through four stops from the active wave spectrum. Do not replace the recipe with centered threshold noise or a greyscale additive layer.
   - Map Grain Amount 0–100 to Paper `noise` 0–0.5: 50 reproduces the official default preset's 0.25 and 100 doubles that reference strength. Keep this mapping shared by Inside, Border, preview, and export.
   - Update `src/app/dispersion/dispersion-webgl.ts` with the new uniforms, exact timeline-periodic animation mapping, retained Paper noise texture, readiness handling for snapshot/export, and complete disposal.
   - Update `src/app/dispersion/dispersion-pipeline.ts` invalidation targets and runtime id while keeping the same three passes and `image-long-edge` workload model.
   - Confirm `src/app/dispersion/dispersion-export.ts` still calls the same resource and therefore needs no alternate effect/export implementation.

6. Align product contracts and tests.
   - Update `src/app/app-acceptance-data.ts` product summary, requested behavior, section inventory, option coverage, conditional effect rows, and observable outcome descriptions without exceeding the app-source line budget.
   - Update `src/app/app-verification-impact.json` for the new adapter and every new acceptance id/pass owner.
   - Extend `src/app/dispersion/dispersion-product.test.ts` and `src/app/app-schema.test.ts` for defaults, clamping, section order, applicability, source extraction, and render-plan assessment.
   - Extend `e2e/dispersion-control-proof.ts` and `e2e/product-dispersion.spec.ts` to select both effects, exercise every area, and drag every conditional slider against real output pixels.

7. Record decisions and verify.
   - Add one Decision Trail entry to `docs/toolcraft/agent-worklog.md`, including the user-authorized Paper source, Apache-2.0 package evidence, integration adaptation, animation intent, state/output mapping, fixed-cost performance decision, and risks.
   - Run the focused checks, start the app, inspect both modes and every area in a real browser, then run the protected delivery gate once.
