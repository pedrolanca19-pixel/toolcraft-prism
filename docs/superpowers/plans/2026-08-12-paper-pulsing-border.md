# Paper Pulsing Border Adaptation Plan

Verification tier: renderer/canvas/runtime scope

Reason: replace the Rounded Border output algorithm inside the retained WebGL pass without changing schema targets, renderer passes, timeline ownership, or export mechanics.

## Reference authority

- Live reference: `https://shaders.paper.design/pulsing-border` with the user-supplied preset.
- Source: pinned `@paper-design/shaders` and `@paper-design/shaders-react` `0.0.80`.
- Preserve Paper's rounded-box SDF, derivative antialiasing, smoke shaping, bloom math, and background compositing. Replace its center-angle spot partition with the requested physical-perimeter 3D ribbon motion.

## Existing-control mapping

- Corner radius → roundness; Height → thickness; Sample spread → softness.
- Saturation → intensity; Glow → bloom.
- Wave count → spots; Spot size → spotSize; Pulse → pulse.
- Turbulence → smoke; Detail → smokeSize.
- Speed and Position → spot time/phase; Inset → equal margins.
- Spectrum/custom colors feed Paper spot colors; Refraction/Chromatic split, Sparkle/Grain, and area masks remain bounded Dispersion extensions after Paper's border mask.

## Implementation

- Add a focused package-source adapter that extracts and validates stable official Pulsing Border recipe markers.
- Replace the custom route/energy Border shader block with the official rounded SDF, smoke, and blend/add bloom pipeline adapted to GLSL1 uniforms.
- Use one closed physical-perimeter coordinate for Rectangle/Rounded and polar arc for Circle. Inside Paper's edge envelope, run a local 3D ribbon raymarch: perimeter distance is the longitudinal axis, signed border distance is the transverse axis, and a bounded march supplies virtual depth. The same three-wave interference, depth fade, refraction/chromatic separation, glow, and Spectrum vocabulary as Inside therefore lives only on the border. `Wave count` is the total packet count, not Paper's per-color nested count; `Wave length` controls how much of the 3D ribbon each moving packet reveals.
- Keep the retained WebGL resource, preview/export material, timeline loop, pipeline registration, and persistence unchanged.
- Update unit tests, browser Rounded/Border behavior proof, verification ownership, reference notes, and worklog.

## Verification

- Prove the official package source is the extraction authority and no custom center/radial approximation remains for Rounded.
- In a real browser, verify the luminous contour stays on all four sides and rounded corners, the perimeter energy centroid advances in the forward direction across at least three timeline phases, frame radius changes contour geometry, and export matches preview.
- Run TypeScript, focused Vitest, code health, targeted Playwright, and one delivery gate. Do not run measured performance.
