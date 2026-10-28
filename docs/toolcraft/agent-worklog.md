# Implementation Worklog

## Status

Mode: product

Active change: prism-field-port

Prism Field is a procedural WebGL2 light-sheet product: a folded height-field surface shaded with refraction, spectral color bands and bloom. It uses runtime-owned editable canvas sizing, Background, Infinity mode, settings transfer, a playback timeline with a seamless forward loop, persistence, image export and video export.

First product delivery uses complete functional proof. Later delivery uses ownership-derived functional proof. A localized performance complaint can authorize one targeted iteration; a complete performance audit remains an explicit user choice through `npm run verify:perf`.

## Decision Trail

### Iteration 1 — Port of the first Prism Field app to Toolcraft

- Change ID: prism-field-port
- Request: "o prism flow era um ref da app mas eu quero as funcionalidade e todos os setting the primeira app que crias te". The first app was a plain HTML and WebGL page asked for in "Build an app that will generate an animated field of prismatic light flowing across a composition ... Give me a versatile set of controls so I can create something different from the reference."
- Task type: Tier 4 first product delivery: new custom WebGL renderer, schema, acceptance matrix and export.
- User-visible result: A Toolcraft app with the first app's complete control set (motion, fold layers, surface detail, lighting, highlights, spectrum, refraction, glow, placement, light mask, backdrop, finish), eight presets, randomize for everything, for colors only and for each section, PNG/JPG and MP4/WebM export, and a 20 second seamless timeline loop.
- Source/reference checked: The first app's source in the classiccarlab repository (`prism/app.js`), the Toolcraft gallery example prism-flow as a pattern for pipeline, export and acceptance structure, and the local Toolcraft docs. The octolane.com page named in the first request was not reachable from the build environment; no reference parity is claimed.
- Reference inputs: None.
- Docs/contracts read: workflow.md; core/runtime-boundary.md, core/layout.md, core/control-selection.md, core/setup-export.md, core/timeline-animation.md; assembly-workflow.md, schema-reference.md, component-rules.md, decision-contract.md, renderer-technique.md, performance.md, acceptance-testing.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, canvas-surface-preserved, controls-product-coverage, controls-section-inventory-required, output-export-required, renderer-technique-inventory, renderer-gpu-provider, renderer-view-interaction, timeline-enabled-behavior, persistence-policy-explicit, acceptance-product-observable, performance-coverage-levels, workflow-required.
- View interaction intent: non-spatial. The sheet is a shaded two-dimensional shader image with no editable three-dimensional scene or model, so there is no orientation gizmo.
- Interaction ownership: None declared. Every operation lives in the controls panel; the canvas has no editing handles, and runtime navigation (pan, zoom, radar) is the only canvas interaction.
- Decision: Port the first app's shader into three retained passes (field, three-level blur, composite) behind one pipeline registration. Express each first-app setting as a built-in schema control generated from one table, so schema, renderer settings, presets and randomizer cannot drift. Motion becomes whole cycles per timeline loop so frame 0 and the wrapped frame are identical; the loop length is the timeline duration.
- Alternatives rejected: Keeping continuous speed and drift controls (they cannot loop seamlessly); a custom panel for presets and randomize (built-in `actions` fit); drawing a bounded backdrop inside the product canvas (runtime owns Background, so the gradient is a Backdrop overlay that disappears with Background); WebGPU (no compute or storage need, and WebGL2 reaches more browsers).
- State/output mapping: Every `prism.*` value, `export.includeBackground` and `appearance.background` feed `readPrismSettings`, which feeds shader uniforms in both the preview canvas and the export frame renderer. Motion values are reduced to loop progress by `getPrismMotion`. Presets and Randomize write values through one `controls.apply` command.
- Performance intent: ordinary-product-work
- Performance model: One fixed-cost field pass per frame (three height samples per pixel), three fixed blur levels and one composite. Only the image export long edge is a workload dimension; octaves and layers are bounded by their schema maxima and do not change pass cardinality.
- Verification: Typecheck, production build, the protected integrity check and the product unit tests pass. The acceptance matrix validator reports no errors. The shader loop seam was measured: the wrapped frame is pixel-identical to frame zero for the same context. The browser acceptance specs in `e2e/product-prism.spec.ts` caught and fixed two real defects before they passed: the 8K export was cropped because browsers cap one WebGL drawing buffer near 33 megapixels (exports now render in 4096 pixel tiles), and the Infinity presentation wrapper clipped its output. The Glass Ribs section was added later: every rib is a cylindrical lens (count, width, irregularity, orientation, lens strength, displacement and edge glow), all conditional on one switch. The protected delivery gate is reported separately in the final summary of this change.
- Risks: Video export is included because the first app recorded video and the user asked for all of its functions; the evidence message reference is the session id because the host exposes no message id. The software GL available in the build environment is far slower than a real GPU, so browser proofs use a 160 by 90 fixture. Grain is static, not animated, to keep the loop seam exact. The Toolcraft shell only runs at 1024 px width or more.

## Decisions

### Renderer

- Decision: Custom WebGL2 renderer with three retained passes: field, blur chain and composite, driven by one pipeline registration with shader-resource, preview-frame and image-export passes.
- Reason: The sheet needs per-pixel noise, lighting and spectral color that DOM, SVG and Canvas 2D cannot evaluate at render-scale backing.
- Evidence: `src/app/prism/prism-gl.ts`, `prism-shaders.ts`, `prism-pipeline.ts`; the harness render of every preset and the loop seam measurement.

### View Interaction

- Decision: Non-spatial; no orbit or gizmo.
- Reason: The output is a shaded two-dimensional image.
- Evidence: `appProductReadiness.viewInteraction` in `src/app/app-acceptance-data.ts`.

### Interaction Ownership

- Decision: No dual-surface operations; the panel owns every setting.
- Reason: Nothing in the first app could be dragged on the canvas.
- Evidence: Empty `interactionOwnership` and no canvas handle rows.

### Timeline

- Decision: Playback timeline with a 20 second default loop and forward-only seamless looping.
- Reason: Motion is a whole number of revolutions per loop, so any duration produces the same seamless cycle.
- Evidence: `getPrismMotion` reduces phases to one revolution; the unit test `loops seamlessly` and the harness seam measurement.

### Layers

- Decision: Layers are not enabled.
- Reason: The user did not request a layer workflow.
- Evidence: No `layersModule()` in `app-schema.ts`.

### Controls

- Decision: Thirteen product sections (including Glass Ribs, a fluted-glass lens mode added after the first delivery) plus Presets, Background and the runtime export sections, all generated from one table.
- Reason: Sections follow the first app's groups, split where a group had more than ten controls, with the four palette stops visible only while Custom colors is on and the mask controls only while Use mask is on.
- Evidence: `appControlSectionInventory` and `validateProductAcceptanceCoverage()` returning no errors.

### Export

- Decision: Image export (PNG and JPG, 2K to 8K) and video export (MP4 and WebM) with runtime-owned encoding.
- Reason: Image is the Toolcraft default; video was part of the first app and the user asked for all its functions.
- Evidence: `productReadiness.exportIntent`; the export frame renderer draws through the same retained programs as the preview.

### Performance

- Decision: One workload dimension, `image-long-edge`, mapped to the image export resolution.
- Reason: Export fill cost grows with the square of the long edge; no other control changes pass cardinality.
- Evidence: `src/app/app-performance.ts` and the passing structural gates in `app-performance.gates.test.ts`.

Canonical control values and selected-entity isolation must follow runtime representations and the declared selection owner. Render-scale-enabled products record functional `renderScaleCoverage`; prose never substitutes for asserted backing-quality proof.

## Evidence

- Source reviewed: the first Prism Field app, the prism-flow gallery example, local Toolcraft docs and runtime types.
- Contract applied: product decisions belong to the generated app; platform development history is not copied into this app.

## Verification

Protected receipts own initial/performance proof. Later edits record focused checks and text journal run IDs. Failed attempts and their retries remain separate; no screenshots, videos or binary traces are required by the journal.

## Risks

- Risk: Browser acceptance runs on software GL in the build environment; timings there say nothing about GPU speed.
- Risk: Seam equality is exact for repeated renders in one context; a different GPU may differ by one color level at sharp creases.
