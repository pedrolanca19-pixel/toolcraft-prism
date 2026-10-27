# Prism Infinity canvas correction

The user reports a scene jump and washed-out wave when enabling Infinity canvas.
This is a Tier 3 functional rendering correction, not a performance iteration.

## Evidence and required behavior

With playback paused, enabling Infinity moves the 1920×1080 output by (+960,
+540) at 100% zoom. The product bounds begin at (0, 0), although the finite
artboard is centered on the world origin. The selected viewport background stays
#E6E6E6, but the shader's `uOpaque` simultaneously controls backdrop-dependent
light gain and background inclusion. Disabling the bounded background therefore
changes the optical composition.

Keep the scene centered and preserve its visible colors across the mode switch.
Infinity must still have a transparent product surface over the runtime-owned
viewport background. Preserve current finite dimensions on restoration, current
timeline phase, viewport navigation, clipping, and export behavior.

## Implementation

1. Center the existing shape-dependent procedural scene bounds on the world
   origin. Keep the established 1920×1080 / 1080×1080 Infinity scene dimensions.
2. Separate preview background presentation from optical shading. Render with
   the existing opaque-background light calculation, then remove the selected
   backdrop into valid premultiplied RGBA for Infinity preview. Choose enough
   alpha to represent every RGB channel; do not discard highlights by clamping
   RGB to the old luminance key.
3. Apply backdrop removal after the final optical effect. The Paper lens samples
   over white and expects an opaque source, so it must receive the same input in
   both modes and remove the backdrop only after its existing final composite.
   Reuse retained programs and passes; no new pass, samples, quality change, or
   runtime modification is needed. Finite/transparent exports retain their
   existing paths.
4. Extend product Infinity proof with stable geometry and actual composited
   pixel comparisons, including light/dark/custom backgrounds and Lens on/off.
   Keep existing restoration, persistence, history, and image-bound proofs.

## Verification

Use real UI changes at a paused frame, compare visible RGB and canvas rectangles,
and verify transparent areas stay transparent. Run focused product tests and
typecheck, then one bare `npm run verify:delivery` at the coherent boundary.
Record actual results and any unrelated gate failures in the worklog.
