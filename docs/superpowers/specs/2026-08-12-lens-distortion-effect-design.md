# Lens Distortion Effect — Design Specification

## Goal

Add Paper Design's official `Lens Distortion` image filter as an optional post-effect over the current Dispersion Studio output. It must work on either `Inside` or `Border`, must not replace either distribution, and must render identically through live preview and runtime-owned still export.

## Reference authority

- Interactive reference: `https://shaders.paper.design/lens-distortion`.
- Official source: `paper-design/shaders`, `packages/shaders/src/shaders/lens-distortion.ts`.
- Installed source packages: exact `@paper-design/shaders` and `@paper-design/shaders-react` version `0.0.80`.
- The core package's `lensDistortionFragmentShader` is the pixel authority. `LensDistortionProps` from the React package is the type authority for the supported settings.

Paper's filter samples an input image up to 50 times along a configurable uniform-to-radial axis. It applies chromatic weighting, biased fan placement, center/edge focus, swirl, noise, barrel or pincushion lens warping, circular lens mapping, sampling grain, and overlay grain.

## Product behavior

`Lens Distortion` is disabled by default, so existing Inside and Border pixels remain unchanged. When enabled, the selected current dispersion frame is first rendered into the retained WebGL target and then passed through the official Paper fragment shader. The output is therefore a composable post-effect, not a third wave mode.

The post-effect receives the current full canvas as its source texture. Toolcraft Canvas remains the sole owner of output dimensions, frame fitting, render scale, clipping, persistence, and export size, so Paper's common sizing controls are intentionally not duplicated. Paper's shader-specific source-pan values remain available.

## Controls and section inventory

Lens Distortion is one product entity with 21 controls, split into three balanced workflow stages because Toolcraft sections allow at most ten controls. The sampling controls gated by the Effect selector disappear while it is off. Warp and Texture remain available as preconfiguration stages because Toolcraft does not allow a selector in one workflow split to hide controls in another; their values affect output as soon as Effect is enabled.

### Lens Distortion — Sampling

- Effect (`boolean`, default `false`).
- Spread (`0..1`, default `0.6`).
- Bias (`-1..1`, default `1`).
- Angle (`0..360`, default `0`).
- Perspective (`0..1`, default `0.1`).
- Count (`2..50`, integer, default `35`).
- Dispersion (`0..1`, default `1`).

### Lens Distortion — Warp

- Dispersion Shift (`-1..1`, default `0`).
- Dispersion Color (`0..1`, default `0.6`).
- Focus Center (`0..1`, default `0.8`).
- Focus Edges (`0..1`, default `1`).
- Swirl (`-1..1`, default `0.35`).
- Lens Bulge (`-1..1`, default `0`).
- Lens Circle (`0..1`, default `0`).

### Lens Distortion — Texture

- Noise (`0..1`, default `0`).
- Noise Frequency (`0..1`, default `0.25`).
- Noise Offset (`0..1`, default `0`).
- Grain Mixer (`0..1`, default `0`).
- Grain Overlay (`0..1`, default `0`).
- Image X (`-1..1`, default `0`).
- Image Y (`-1..1`, default `0`).

## State and interaction ownership

All values live in Toolcraft schema state under `lens.*`, with defaults matching Paper. The panel owns exact effect configuration, reset, persistence, settings transfer, and export parity. The canvas has no duplicate drag handles because they would hide the optical result and cannot expose the full normalized parameter set precisely.

Persistence version increments so older workspaces receive deterministic defaults. Timeline ownership does not change: current dispersion motion is evaluated first, and Lens Distortion filters that exact frame. Paper `speed` and `frame` are not exposed because this image filter has no independent time uniforms; current noise controls are spatial seeds, not autonomous animation.

## Renderer technique

The existing retained WebGL renderer remains canonical. The disabled branch uses the existing direct or internal-target path unchanged. The enabled branch always renders the selected Inside/Border material into the retained source target, then renders one fullscreen post-process quad using the package-exported `lensDistortionFragmentShader`.

The fullscreen vertex shader supplies `v_imageUV` directly. `u_imageAspectRatio` follows the actual render target. The remaining shader uniforms map 1:1 from normalized state. Preview can sample the existing bounded-density source target into Toolcraft's exact backing; export omits preview downscaling and executes the same official filter at artifact resolution.

## Performance model

Lens Distortion adds one conditional GPU post-process pass. `Count` is a real linear workload control because the official shader exits its fixed 50-iteration loop at the selected sample count; it is modeled as `lens-samples`, default 35, interactive and batch maximum 50. Other controls update uniforms without changing pass count or loop cardinality.

No measured performance run is authorized by this feature request. Structural pipeline, workload, path, fixture, and impact ownership are updated, followed by focused functional/browser checks and one protected functional delivery.

## Acceptance

- Off preserves the baseline output.
- On changes persistent output pixels for both Inside and Border.
- Every Paper-specific control is visible only when enabled and changes the expected optical property.
- Count accepts every integer from 2 through 50 and is clamped on imported invalid state.
- Preview and PNG/JPG export use the same current-frame post-effect.
- Reload and settings transfer restore the toggle and all parameter values.

## Verification tier

Verification tier: renderer/canvas/runtime scope — renderer/canvas/runtime feature.

Reason: the batch adds 21 schema targets, a conditional WebGL post-process, a new workload dimension, persistence changes, acceptance, and preview/export proof.

Run: focused schema/product Vitest, TypeScript and code-health checks, real-browser control/output/export checks for Inside and Border, then one bare `npm run verify:delivery`; finally ensure `npm run dev` is available.

Skip: measured performance and the full performance audit because the request is a product feature, not performance authority.
