# Remove Border Mode

## Product outcome

Dispersion Studio exposes one canonical Inside light-sheet renderer. The Wave Mode section, Border-only controls, closed-perimeter shader branch, and Paper Pulsing Border adapter are removed. Frame shape, the central field controls, timeline playback, Sparkle, Grain, Lens Distortion, persistence, settings transfer, preview, and image export remain intact.

## Implementation

1. Remove the distribution and Border-only targets, defaults, parsing, schema section, and acceptance rows from `src/app`.
2. Remove the Border material, uniforms, render branch, shader exports, Paper adapter, and obsolete production files while preserving the shared Inside light-sheet core.
3. Update renderer pipeline, product metadata, verification impact ownership, tests, browser proofs, spec, and worklog for the single Inside topology.
4. Increment the workspace persistence version so an older stored `border` value cannot affect the new single-mode renderer.

## Verification

Verification scope: renderer/canvas/runtime feature

Reason: the visible control schema and retained WebGL renderer lose one complete branch, but the remaining Inside renderer, animation, export, and effects retain their existing architecture.

Run: focused TypeScript/Vitest checks, focused Playwright proof that Border is absent and Inside still renders/animates, then one bare `npm run verify:delivery` and the local dev server.

Skip: measured performance and the explicit full performance audit because the request is a functional mode removal, not a performance complaint.
