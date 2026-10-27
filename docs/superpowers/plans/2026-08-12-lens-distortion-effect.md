# Lens Distortion Effect — Implementation Plan

1. Pin the requested Paper packages with npm and inspect the installed `LensDistortionProps`, presets, shader source, and maximum sample count.
2. Extend `dispersion-values.ts` with the `lens.*` targets, Paper-matching defaults, normalized settings type, validation/clamping, and a persistence version bump in `app-schema.ts`.
3. Add `dispersion-lens-distortion-schema.ts` with three balanced workflow sections and splice them into `dispersion-schema-sections.ts`; declare `Count` as the only new workload control.
4. Add `dispersion-lens-distortion.ts` as the package-backed adapter: type settings against `LensDistortionProps`, import `lensDistortionFragmentShader`, create the retained fullscreen material/scene, map uniforms, and dispose its GPU resources.
5. Integrate that adapter into `dispersion-webgl.ts` after the existing Inside/Border source render. Keep the disabled path byte-stable and use the same enabled path for preview, snapshot, and export.
6. Add lens targets to the canonical preview/export invalidation paths, model their conditional post-process cost with the `lens-samples` workload dimension/fixture mapping in `dispersion-pipeline.ts` and `app-performance.ts`, and update `app-verification-impact.json` without inventing a second canonical preview pass.
7. Add focused acceptance metadata, section inventory, interaction ownership, product summary, and browser helpers without growing capped modules past 700 lines. Add unit tests for defaults/clamping/schema/source binding and Playwright proof for conditional controls, Inside/Border pixel response, and export.
8. Update the worklog with the reference/source evidence, control split, post-process decision, state/output mapping, renderer/export behavior, and functional-only verification intent.
9. Before proof, read the routed verification contracts. Run focused Vitest, `pnpm typecheck`, `pnpm ai:check`, focused Playwright in the local browser, and one bare `npm run verify:delivery`. Do not run measured performance. Leave the app available through `npm run dev`.
