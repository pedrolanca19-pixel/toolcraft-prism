# Lens Distortion Targeted Performance Plan

## Goal

Reduce the visible latency of enabling and adjusting the optional Paper Lens
Distortion post-effect while preserving the official Paper GLSL, the selected
2–50 sample count, exact preview/export pixels, render-scale backing, and the
existing Inside/Border animation.

## Diagnosis

- At the current default 1920×1080 canvas, DPR 2, and Resolution scale 2, the
  canvas backing is 7680×4320 and the optical/Lens working frame is 3840×2160.
- Browser reproduction measured p50 requestAnimationFrame gaps of about 50 ms
  with Lens disabled and 66.6 ms with Lens enabled at Count 35.
- Enabling Lens measured INP 396 ms: 105 ms processing and 291 ms presentation
  delay. The Lens ShaderMaterial is created eagerly but its GPU program is first
  compiled only when the effect is enabled.
- The renderer calls `gl.flush()` on every preview frame even though
  snapshot/export already performs an explicit `finish()` after rendering.
  `preserveDrawingBuffer` remains necessary for complete off-viewport pixel
  inspection and downstream canvas capture.

## Implementation

1. Add a retained Lens pass preparation API and asynchronously precompile the
   official Paper program when the WebGL resource is created.
2. Remove per-frame explicit flushes; retain deterministic fullscreen clears
   and complete framebuffer access, keep the explicit snapshot `finish()`, and
   prove decoded export output remains identical in behavior.
3. Update static Lens uniforms only when Lens settings or source aspect change;
   animation frames continue to update only the source texture and draw calls.
4. Keep the canonical renderer pipeline at three passes and keep
   `lens-samples` at its exact 2–50 workload envelope. Do not reduce resolution,
   sample count, animation cadence, or preview/export fidelity.
5. Add focused tests for eager program preparation, retained resources,
   no per-frame flush, complete canvas pixels, and unchanged Paper source.
6. Keep `app-verification-impact.json` and the product worklog aligned with the
   touched Lens/WebGL modules and exact targeted performance authority.

## Product Surface

- Controls/sections/defaults: unchanged.
- Timeline/playback: unchanged.
- Layers: unchanged and disabled.
- Persistence/settings transfer: unchanged.
- Preview: same pixels and backing size, lower application latency.
- Export: same runtime-owned export path and full-resolution decoded image.

## Verification

Verification scope: renderer/canvas/runtime feature
Reason: retained WebGL resource lifecycle and Lens preview/export execution are
optimized without changing schema or visual output.
Run: focused Vitest, focused Lens browser acceptance, protected kernel check if
required by the render-plan assessment, then one bare `npm run verify:delivery`
for the localized performance iteration and `npm run dev`.
Skip: `npm run verify:perf`; the user localized the request to applying Lens,
so a complete maximum-fixture audit is neither requested nor authorized.
