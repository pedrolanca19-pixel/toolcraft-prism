# Restore Color Balance Pad

## Goal

Restore the missing built-in two-axis Color Balance Pad that grades the final dispersion image between Cyan/Red and Blue/Yellow without changing geometry, animation, grain shape, or Lens behavior.

## Product decision

- Promote `dispersion.colorBalance` from the archived draft target into active Toolcraft state.
- Use one built-in `vector` control in the existing `Color Balance` entity section.
- Horizontal axis: Cyan at the negative end, Red at the positive end.
- Vertical axis: Blue at the negative end, Yellow at the positive end.
- Default `[0, 0]` is exactly neutral.
- Apply the balance after the shared light-sheet composite and before the optional Paper Lens post-pass, so preview and image export share the same graded source.
- Keep the panel as the sole owner; no duplicate canvas gesture.

## Files

- `src/app/dispersion/dispersion-values.ts`: active target, typed/default value, bounded reader.
- `src/app/dispersion/dispersion-schema-sections.ts`: built-in Vector section.
- `src/app/dispersion/dispersion-section-inventory.ts`: retain and align the existing entity declaration.
- `src/app/dispersion/dispersion-interaction-ownership.ts`: declare panel ownership.
- `src/app/dispersion/dispersion-light-sheet-core.ts`, `dispersion-shaders.ts`, `dispersion-webgl.ts`: uniform and final color-grade mapping.
- `src/app/dispersion/dispersion-pipeline.ts`: include the target in preview invalidation.
- `src/app/app-acceptance-data.ts`, `src/app/app-verification-impact.json`: observable and ownership coverage.
- `src/app/app-schema.test.ts`, `src/app/dispersion/dispersion-product.test.ts`, `e2e/product-dispersion.spec.ts`: schema, shader, and real Pad interaction proof.
- `docs/toolcraft/agent-worklog.md`: decision trail.

## Verification

Verification tier: Tier 3 — active schema state and WebGL output change.

- Run focused schema/product unit tests and typecheck.
- Run the one Color Balance browser acceptance scenario against the real Pad.
- Run `npm run ai:check`.
- Do not run measured performance; this adds fixed scalar color math and no workload dimension.
- Defer the bare protected delivery gate until the current broader uncommitted Curve/Shading batch reaches its coherent delivery boundary, avoiding another accidental 70-test matrix during this focused restoration.
