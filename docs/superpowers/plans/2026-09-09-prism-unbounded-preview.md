# Prism unbounded preview implementation plan

**Goal:** Infinity removes the procedural image boundary, frame shape clipping,
and frame-margin fade, while retaining the existing wave coordinates and colors.

**Architecture:** Use the runtime `infiniteCanvasContent` viewport slot for the
unbounded preview. Portal the product-owned WebGL canvas into that slot in Infinity; finite
mode keeps its original product surface. Use the existing pipeline and export
provider lifecycle. The runtime remounts the product scene when its mode changes,
so initialize the new renderer from the committed timeline phase. Sample the procedural field in world coordinates rather than stretching
the old image to fit the viewport. Explicit scene bounds still define exports.

**Tech stack:** React, Toolcraft's existing composition slots, Three/WebGL2, GLSL,
ResizeObserver, Vitest, and browser output checks.

This is continued Tier 3 functional work under the user's existing production
authorization. Shared runtime files and verification gates remain unchanged.

- [x] Add a product-owned viewport mount and immutable viewport-size observation;
  its only DOM measurement is its own viewport slot, never scene/export bounds.
- [x] Add a pure view-window calculation: logical scene size 1920×1080 times
  zoom/backing scale, centered in the viewport and offset by runtime pan. Verify
  center, zoom, pan, resizing, and output-pixel scaling with focused unit cases.
- [x] Render one product canvas through the finite mount or infinite portal.
  Preserve the committed phase through the runtime's existing scene remount. Infinity backs the full viewport at selected scale;
  finite mode restores its current frame and shape exactly.
- [x] Feed field GLSL the logical image resolution and sample offset. Infinity
  disables only frame-margin fade and CSS frame clipping, keeping authored masks.
  Adapt the retained lens's virtual-image/texture coordinates so the old image
  rectangle does not turn into a white sampling border.
- [x] Keep real viewport camera changes renderable during pan while suspending
  nonessential animation progression; update the existing pipeline invalidation.
- [x] Extend browser proof: visible color beyond the old rectangle at 50% zoom,
  no rectangle/circle/rounded clip in Infinity, stable center and sampled colors,
  restored finite shape, persistence/history, selected backing, and PNG export.
- [x] Run focused unit/type/build and browser checks; run the required bare
  delivery gate once for the completed renderer batch and report its real result.
- [x] Publish an isolated source snapshot to the existing Prism Flow production
  project and verify the actual public entry URLs and unbounded preview.

Rejected alternatives: enlarging a finite image moves the boundary instead of
removing it; scaling a bitmap changes the wave; a second concurrent renderer duplicates GPU resources and risks diverging
preview/export behavior.

Export remains finite by design: existing explicit product bounds are the crop,
and the viewport environment is not itself an export-bounds source. Lens samples
outside the currently rendered texture use edge extension instead of introducing
the former image-frame matte. Validate its appearance at viewport margins.
