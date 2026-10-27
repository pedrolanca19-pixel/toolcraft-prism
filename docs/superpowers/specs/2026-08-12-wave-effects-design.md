# Wave Effects Design

Date: 2026-08-12

## Goal

Turn the existing sheet-bound Sparkle into a first-class configurable effect and add a second Grain Gradient effect sourced directly from Paper Shaders. Both effects remain part of the same dispersion-wave output and can be restricted to meaningful optical regions of that wave.

## Reference Study

- Reference: `https://shaders.paper.design/grain-gradient`.
- Official implementation: `paper-design/shaders`, `packages/shaders/src/shaders/grain-gradient.ts`, Apache-2.0.
- Package API checked: colors, background, softness, intensity/distortion, noise, seven shapes, speed, frame, scale, rotation, and offset.
- User-approved source strategy: install and use the official package code rather than reimplementing the noise algorithm.
- Integration adaptation: use Paper's Grain Gradient noise kernel plus its grain-to-shape, derivative-antialiasing, and color-mixer recipe as a true two-dimensional screen-space overlay over the completed image. Its coordinates come from output pixels and never from the raymarched surface or camera perspective. The selected wave-region mask controls only where this 2D layer is composited.

## Product Behavior

The new `Effects` section owns one effect selector and its conditional controls.

### Effect selector

- `Sparkle` — the current surface-bound sparkle, promoted out of Dispersion Field.
- `Grain Gradient` — Paper's sparse luminous grain recipe applied to the wave.
- There is no separate Off mode. Setting the active effect's Amount to zero is the explicit neutral state and keeps the section compact.

### Shared area selector

Both effects can target:

- `Whole wave` — all emitted wave light;
- `Core` — the brightest white caustic;
- `Glow` — the middle-energy bloom around the core;
- `Color bands` — chromatically separated portions of the wave;
- `Veil` — the faint atmospheric contribution away from the core.

The area selector changes only the effect mask. It never changes the underlying ridge, spectrum, glow energy, frame mask, or background.

### Sparkle settings

- `Amount` — existing `dispersion.sparkle` value, retained for persisted settings compatibility;
- `Size` — spatial scale of the specks on the wave surface;
- `Twinkle` — seamless periodic contrast animation tied to Toolcraft timeline progress.

The default Sparkle settings reproduce the current sparkle scale and density. Existing saved Amount values keep working.

### Grain Gradient settings

- `Amount` — Paper noise contribution; 50 maps to the official default preset's `noise: 0.25`, while 100 reaches `0.5`, twice that reference strength;
- `Scale` — size of the grain structure;
- `Softness` — transition sharpness, matching the reference meaning;
- `Distortion` — reference-style displacement between grain bands;
- `Drift` — seamless forward motion of the grain coordinates.

The Grain effect uses the active Dispersion Spectrum as its color source rather than introducing a second independent palette entity.

## Control Section Inventory

| Section | Entity | Targets | Grouping reason |
| --- | --- | --- | --- |
| Effects | Wave image effect | effect mode, area, Sparkle amount/size/twinkle, Grain amount/scale/softness/distortion/drift | Selection, 2D placement mask, and conditional tuning all edit one effect applied to the completed wave image. Ten declared controls remain within the cohesive-section cap; every control declares a semantic group. |

All controls use built-in `select` and `slider` schema types. No custom control, canvas handle, layer, or panel action is required.

## State And Renderer Mapping

- `effect.mode` -> `sparkle | grain`;
- `effect.area` -> `all | core | glow | bands | veil`;
- existing `dispersion.sparkle` -> Sparkle amount;
- new Sparkle targets -> speck scale and periodic twinkle depth;
- new Grain targets -> Paper noise amount, coordinate scale, smoothing, distortion, and drift.

The existing wave shader first produces one deterministic field, then composites Grain in output-pixel coordinates as a flat 2D layer. The installed Paper fragment source supplies both the exact reusable noise functions and its complete grain-to-shape recipe: positive-only noise perturbs a shape coordinate, `fwidth` antialiases it, and the resulting mixer selects luminous color stops. A small pinned-version adapter extracts those blocks, performs the single GLSL1 texture-call compatibility rewrite, and injects them into the existing field shader. The color stops come from the active Dispersion Spectrum so the Paper behavior belongs to the current wave rather than a second independent palette. The official Paper randomizer texture is retained as a renderer-scoped GPU resource and disposed with the existing WebGL resource.

Preview and still export use the same `DispersionGlResource`, settings normalization, package noise source, texture, region masks, and timeline phase. No app-owned encoder or alternate export path is added.

## Animation Intent

- Mode: existing Toolcraft playback timeline.
- Sparkle Twinkle and Grain Drift derive from the same normalized forward loop as the wave.
- First and last frames remain equal; no mirror, yoyo, reverse, or local wall-clock animation is introduced.
- Timeline duration continues to set the loop length without changing effect design values.

## Persistence, Layers, And Export

- Persistence remains Toolcraft local workspace persistence; schema version increments for the new targets.
- Layers remain disabled because effects are treatments of one procedural output, not independent selectable objects.
- Image export remains PNG/JPG through the runtime and includes the selected effect at the current timeline frame.
- Video export remains not requested.

## Performance Model

The effects add bounded uniforms and constant-cardinality shader arithmetic to the existing preview/export pass. No control changes raymarch iterations, source count, or output resolution, so every new control is `responsiveness`, not `workload`. The existing `image-long-edge` export dimension remains the only workload dimension. The retained Paper noise texture belongs to the existing renderer-scoped shader resource.

## Acceptance

- Effect selector shows both modes and each produces distinct persistent pixels.
- Applicability hides Sparkle controls in Grain mode and Grain controls in Sparkle mode while preserving values across switches.
- Every Area option visibly moves the active effect to the promised optical region.
- Each Sparkle and Grain slider changes rendered pixels through the real UI.
- Grain Amount 50 matches Paper's default `noise: 0.25`; 100 doubles that contribution and remains visibly stronger without reverting to centered grey TV grain.
- Paused timeline frames are deterministic; playback changes Twinkle/Drift and the loop seam still matches.
- Preview and decoded still export contain the same selected effect and area treatment.

## Verification Classification

Verification tier: broad renderer/schema scope — dependency addition plus a major renderer/schema/animation-control extension with preview/export parity.

Development checks: code health, focused value/schema/product tests, shader compile/render harness, and focused browser interaction for both effect branches and all areas.

Delivery check: one bare `npm run verify:delivery`, followed by `npm run dev` and a real browser smoke check. Measured performance is not authorized and will not run.
