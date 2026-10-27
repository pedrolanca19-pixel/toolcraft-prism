# Shared 3D Perimeter Field Plan

Verification scope: renderer/canvas/runtime feature

Reason: correct the Border renderer from a separate segmented light-strip approximation to the same volumetric field used by Inside, while changing only its closed-perimeter coordinate domain and animation path.

## Product decision

- Keep `Inside` pixel-identical and extract its fixed 38-step raymarch into one shared GLSL kernel.
- `Border` evaluates that kernel in closed tube coordinates derived from the real Rectangle/Rounded/Circle signed-distance contour. Paper's Pulsing Border source remains geometry authority for the rounded SDF and antialiasing only; it no longer defines the visible wave character.
- The perimeter route supplies a seamless longitudinal phase, signed distance supplies the transverse axis, and the shared march retains virtual depth, three-wave folding, interference, depth fog, spectral palette, channel split, glow, Sparkle surface coordinates, and planar Grain compositing.
- Remove separated packet masks and the reduced 24-step Border-specific volume. The field remains continuous around the full contour. `Waves` changes closed-route repetition/complexity without creating gaps; `Wave length` changes longitudinal feature scale; `Influence area` changes transverse reach; Frame margin changes distance from the canvas center; Position offsets the field along the local contour normal toward or away from the center.
- Use the existing Toolcraft playback timeline. Morphology uses the same seamless field time as Inside, while a separate integer-circuit route phase moves the complete field forward around the border. No reverse or ping-pong motion is introduced.

## Files

- Add a focused shared GLSL raymarch module under `src/app/dispersion`.
- Update `dispersion-shaders.ts` to consume the shared core without changing Inside output.
- Replace the packet implementation in `dispersion-border-shader.ts` with the shared core plus Paper perimeter envelope.
- Map the complete shared field uniform set in `dispersion-webgl.ts`; keep preview and export on the same retained material.
- Update product tests, registered browser acceptance, verification ownership, performance technique prose, product design notes, and the Toolcraft worklog.

## Performance and lifecycle

- Reachable inputs and schema ranges are unchanged.
- Border remains one retained fullscreen GPU pass. The shared march has a fixed 38-step maximum and executes only inside the bounded perimeter influence envelope; no user-controlled loop bound or new pass is added.
- Preview animation still invalidates only `dispersion.preview-frame`; image export still evaluates one deterministic current-timeline frame.
- This is a functional visual correction, not measured-performance authority.

## Verification

- Preserve an exported Inside reference and prove the shared-core extraction does not materially change it.
- Focused Vitest verifies one shared 38-step kernel, removal of packet masking, complete control mapping, and periodic route math.
- Registered Playwright acceptance verifies: empty center, continuous energy on all four sides/corners, forward circular motion across three phases, distinct timeline frames, and preview/export parity.
- Run TypeScript, `pnpm ai:check`, focused Vitest and Playwright during development, then one bare `npm run verify:delivery`. Do not run measured performance.
