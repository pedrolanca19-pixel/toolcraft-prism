# Dispersion Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Toolcraft canvas product that authors and exports seamless animated chromatic-dispersion fields with adjustable masks, optics, color, and motion.

**Architecture:** Toolcraft owns the shell, state, controls, finite/infinite canvas, timeline, persistence, and export actions. Focused product modules own one normalized settings model, one retained two-stage WebGL2 refraction renderer shared by live preview and export, one Canvas 2D unavailable-WebGL fallback, and one canonical renderer-pipeline declaration reused by performance assessment.

**Tech Stack:** React 19, TypeScript 6, Toolcraft runtime schema/hooks, WebGL2/GLSL ES 3.0, Canvas 2D export destination/fallback, Vitest, Playwright.

---

The folder is not a Git repository, so commit steps are replaced with local verification checkpoints. The Toolcraft project contract authorizes inline execution in this session; no subagent dispatch is used.

## File Map

- Create `src/app/dispersion/dispersion-values.ts`: target constants, typed settings, safe state reader, spectrum presets, and pure loop parameters.
- Create `src/app/dispersion/dispersion-draw.ts`: mask geometry and deterministic Canvas 2D painting.
- Create `src/app/dispersion/dispersion-renderer.tsx`: live canvas lifecycle, render-scale backing, runtime timeline, and interaction coalescing.
- Create `src/app/dispersion/dispersion-renderer.module.css`: local-only canvas sizing styles.
- Create `src/app/dispersion/dispersion-export.ts`: runtime-owned export callback using the shared draw function.
- Create `src/app/dispersion/dispersion-pipeline.ts`: canonical preview/export pass registration.
- Create `src/app/dispersion/dispersion-product.test.ts`: deterministic model/draw/schema behavior tests.
- Modify `src/app/app-schema.ts`: editable-output canvas, timeline, built-in sections, background, image export, and sticky action.
- Modify `src/app/app-composition.tsx`: product renderer, export callback, scene bounds, and pipeline.
- Modify `src/app/app-acceptance-data.ts`: product readiness, Video Reference Study, inventories, acceptance rows, and render/timeline/export coverage.
- Modify `src/app/app-performance.ts`: Canvas 2D technique, pixel workload envelope, derived paths, scenarios, and render-plan assessment.
- Modify `src/app/app-verification-impact.json`: exact module ownership.
- Create `e2e/product-dispersion.spec.ts`: focused real-browser product behavior and screenshot evidence.
- Modify `docs/toolcraft/agent-worklog.md`: product-mode decision trail and final evidence level.

### Task 1: Product State Model

**Files:**
- Create: `src/app/dispersion/dispersion-values.ts`
- Test: `src/app/dispersion/dispersion-product.test.ts`

- [ ] **Step 1: Write the failing state-model test**

```ts
it("normalizes defaults and preserves a seamless loop", () => {
  const settings = readDispersionSettings({ values: {} } as ToolcraftState);
  expect(settings.mode).toBe("central");
  expect(settings.shape).toBe("rounded");
  expect(getDispersionPhase(0)).toEqual(getDispersionPhase(1));
});
```

- [ ] **Step 2: Run the focused test and observe the missing-module failure**

Run: `pnpm vitest run src/app/dispersion/dispersion-product.test.ts`

Expected: FAIL because `dispersion-values.ts` does not exist.

- [ ] **Step 3: Implement the typed target map and safe reader**

Define `dispersionTargets` for frame, field, color, motion, background, and export targets. Define literal unions for `DispersionMode`, `FrameShape`, and `SpectrumName`. Implement `readDispersionSettings(state)` with finite-number clamping to the schema domains and stable defaults. Implement `getDispersionPhase(progress)` with only periodic `sin(2πp)` / `cos(2πp)` outputs so 0 and 1 are equal.

- [ ] **Step 4: Run the state-model test**

Run: `pnpm vitest run src/app/dispersion/dispersion-product.test.ts`

Expected: PASS for defaults, clamps, spectra, and the first/last-frame phase seam.

### Task 2: Schema And Inventory

**Files:**
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/app-identity.ts`
- Test: `src/app/dispersion/dispersion-product.test.ts`

- [ ] **Step 1: Add a failing schema assertion**

```ts
expect(appSchema.canvas.sizing.mode).toBe("editable-output");
expect(appSchema.panels.timeline?.mode).toBe("playback");
expect(findControl("frame.cornerRadius").applicability.mode).toBe("conditional");
expect(findControl("actions.output").actions?.[0]).toMatchObject({ role: "export-image" });
```

- [ ] **Step 2: Implement the schema**

Set identity title to `Dispersion Studio`. Configure `canvas` as 1920×1080 editable output with `renderScale: true` and no upload. Enable playback timeline with an eight-second default. Add these product sections, each with explicit `applicability`, defaults, `performanceRole`, and `performanceReason`:

- Frame: `frame.shape`, conditional `frame.cornerRadius`.
- Dispersion Field: `dispersion.mode`, `dispersion.position`, `dispersion.inset`, `dispersion.height`, `dispersion.refraction`, `dispersion.spread`, `dispersion.softness`, `dispersion.bend`.
- Color: `dispersion.spectrum`, `dispersion.intensity`, `dispersion.glow`.
- Motion: `motion.flow`, `motion.undulation`, `motion.detail`, `motion.shimmer`, `motion.seed`.
- Background source pair: `export.includeBackground`, `appearance.background`.
- Image Export: `export.image.format`, `export.image.resolution` in one two-column row.
- Sticky action: typed `export-image` action labeled `Export PNG` with value `export.png`.

Use localStorage persistence for `values`, `canvas`, `panels`, and `timeline`; enable settings transfer and history/radar/theme/zoom toolbar owners.

- [ ] **Step 3: Run schema and focused product tests**

Run: `pnpm vitest run src/app/app-schema.test.ts src/app/dispersion/dispersion-product.test.ts`

Expected: PASS with no implicit applicability, invalid segmented fit, missing default, or runtime Setup duplication.

### Task 3: Deterministic Canvas 2D Drawing

**Files:**
- Create: `src/app/dispersion/dispersion-draw.ts`
- Test: `src/app/dispersion/dispersion-product.test.ts`

- [ ] **Step 1: Add failing deterministic-draw tests**

Create a recording 2D context double and assert that each mode constructs a non-empty path/composite sequence, Rounded calls rounded-rectangle geometry, Circle calls ellipse geometry, and progress 0/1 emit identical numeric commands.

- [ ] **Step 2: Implement mask and field geometry**

Export `drawDispersionFrame({ context, frame, pixelRatio, progress, settings, includeBackground })`. Transform scene coordinates into the supplied frame, clear only the supplied frame, optionally paint `settings.background`, clip to Rectangle/Rounded/Circle, then draw the selected analytic field:

- Central: a continuous horizontal Bézier-like sampled polyline.
- Diagonal: the same field with a slope term.
- Ripple: two coupled periodic ridges.
- Edge Glass: inset rounded-perimeter strokes.
- Halo: inset ellipse strokes.

- [ ] **Step 3: Implement spectral compositing**

For each spectrum, paint broad channel lobes with `filter: blur(...)`, `globalCompositeOperation: screen`, and low alpha; paint three narrower channel offsets; then paint a white ridge. Reset transform, filter, alpha, line caps, and composite mode before returning. Apply a final `destination-in` mask so product output respects the selected frame shape.

- [ ] **Step 4: Run deterministic drawing tests**

Run: `pnpm vitest run src/app/dispersion/dispersion-product.test.ts`

Expected: PASS for all five modes, three masks, spectrum selection, and loop seam.

### Task 4: Renderer Pipeline And Live Preview

**Files:**
- Create: `src/app/dispersion/dispersion-pipeline.ts`
- Create: `src/app/dispersion/dispersion-renderer.tsx`
- Create: `src/app/dispersion/dispersion-renderer.module.css`
- Modify: `src/app/app-composition.tsx`

- [ ] **Step 1: Declare the canonical pipeline**

Register `dispersion.preview-frame` and `dispersion.image-export`. Initial render, relevant control changes, control drags, animation frames, timeline playback/scrub, canvas sizing, and render scale invalidate preview; viewport pan/zoom invalidate neither pass; the export action and export settings invalidate only image export.

- [ ] **Step 2: Implement the live renderer**

Use `useToolcraft`, `useToolcraftProductSceneFrame`, `getToolcraftTimelineLoopProgress`, `shouldIncludeToolcraftPreviewBackground`, and `useToolcraftPipeline`. Size the canvas backing to `scene CSS size × devicePixelRatio × canvas.renderScale` while keeping CSS dimensions equal to the scene frame. Render immediately after state changes and on playback animation frames. Suspend/coalesce animation draws while runtime canvas pointer/wheel interactions are active, then resume from canonical timeline state without changing play/pause.

- [ ] **Step 3: Compose the product**

Set `canvasContent: <DispersionRenderer />`, `renderDefaultCanvasMedia: false`, canonical `rendererPipelineRegistration`, finite/infinite `sceneBoundsProvider` returning the current canvas-sized product rect, and the shared export renderer from Task 5.

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`

Expected: PASS with only allowed Toolcraft extension points and local CSS-module selectors.

### Task 5: Runtime-Owned Image Export

**Files:**
- Create: `src/app/dispersion/dispersion-export.ts`
- Modify: `src/app/app-composition.tsx`
- Test: `src/app/dispersion/dispersion-product.test.ts`

- [ ] **Step 1: Add a failing export parity test**

Invoke `dispersionExportRenderer.renderFrame` with a recording 2D context and confirm it uses the exact frame, timeline progress, state-derived settings, and the same draw signature as preview.

- [ ] **Step 2: Implement the export renderer**

Define a `ToolcraftProductExportRenderer` with base file name `dispersion-studio`. Its `renderFrame` calls `drawDispersionFrame` using the runtime-provided context, frame, pixel ratio, state, and timeline progress. It does not allocate a canvas, encode, download, or create object URLs.

- [ ] **Step 3: Run export and product tests**

Run: `pnpm vitest run src/app/dispersion/dispersion-product.test.ts src/app/app-acceptance.product-output-export.test.ts`

Expected: PASS with one typed export action and one deterministic product renderer.

### Task 6: Acceptance, Reference Mapping, And Performance Model

**Files:**
- Modify: `src/app/app-acceptance-data.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-verification-impact.json`

- [ ] **Step 1: Replace starter readiness**

Declare product name, summary, requested behavior, image `toolcraft-default`, video `not-requested`, non-spatial view intent, and panel ownership entries for frame mask, field placement, and optical tuning.

- [ ] **Step 2: Encode the Video Reference Study**

Add storyboard frames at 0, 5, 11, and 17 seconds; three transition deltas; the reference behavior decomposition; and acceptance mappings to Central mode, Refraction/Spread, Glow/Spectrum, and timeline loop rows.

- [ ] **Step 3: Author the control-section inventory and acceptance matrix**

Inventory Frame, Dispersion Field, Color, Motion, Background, and Image Export entities with exact targets and grouping reasons. Add runtime rows for settings transfer, canvas sizing, Infinity restoration/export, render-scale interaction/playback/steady proof, persistence, timeline playback/loop, background, and full image-artifact export. Add a rendered-pixel row for every product control; use `optionCoverage: "each-visible-item"` for Frame shape, Mode, and Spectrum.

- [ ] **Step 4: Author and assess performance configuration**

Use the canonical pipeline with Canvas 2D technique metadata. Declare one batch-only `image-long-edge` schema dimension for 2K/4K/8K export and its exhaustive adapter; preview field geometry remains constant-cost. Derive canonical paths and one scenario per path. Export scenarios point to `Export PNG` / `export.png`. Export `appRenderPlanAssessment = assessToolcraftRenderPlan(appSchema, appPerformance)` and assert it has no structural errors.

- [ ] **Step 5: Map verification ownership**

List every product production module in `app-verification-impact.json`. Mark schema/values/draw/renderer/composition/export as functional or performance according to their effect; attach nearest acceptance IDs and exact pass IDs only where the module changes renderer execution.

- [ ] **Step 6: Run functional configuration tests**

Run: `pnpm vitest run src/app/app-acceptance-data.ts src/app/app-performance.gates.test.ts src/app/dispersion/dispersion-product.test.ts`

Expected: PASS with complete product acceptance, derived performance paths, and zero structural render-plan errors.

### Task 7: Focused Browser Product Proof

**Files:**
- Create: `e2e/product-dispersion.spec.ts`

- [ ] **Step 1: Write the browser test**

Open the app, locate `[data-dispersion-canvas]`, record a center/corner pixel signature, change Mode to Edge Glass, and assert persistent pixel change. Change Shape to Circle and assert transparent/neutralized corner pixels while center pixels remain non-empty. Switch to Rounded, verify Corner radius appears, edit it, scrub the timeline, and prove the frame changes. Exercise background off/on, resolution scale backing, and `Export PNG` download through public Toolcraft helpers.

- [ ] **Step 2: Run the focused browser test**

Run: `pnpm playwright test e2e/product-dispersion.spec.ts`

Expected: PASS with artifacts stored only under `.toolcraft/browser-artifacts/`.

- [ ] **Step 3: Run the standard functional browser suite**

Run: `pnpm test:browser`

Expected: PASS; no `browser perf:` tests are executed.

### Task 8: Worklog And Delivery

**Files:**
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] **Step 1: Replace starter worklog status**

Set `Mode: product`. Add one Decision Trail entry containing the Russian request summary, broad renderer/schema scope task type, reference path and extracted frames, selected routes/docs, renderer/timeline/layers/controls/export/performance decisions, panel ownership, state/output mapping, rejected CSS/WebGL alternatives, ordinary-product-work performance intent, one bare-delivery narrative, and known Canvas 2D blur/export risks.

- [ ] **Step 2: Run pre-delivery code health and focused checks**

Run: `pnpm ai:check && pnpm typecheck && pnpm vitest run src/app/dispersion/dispersion-product.test.ts`

Expected: all commands PASS.

- [ ] **Step 3: Run the one protected delivery gate**

Run: `npm run verify:delivery`

Expected: first product delivery writes a functional receipt after complete product contracts, one production build, and full functional acceptance; measured performance is not run.

- [ ] **Step 4: Start the product and perform the final visual check**

Run: `npm run dev`

Expected: Vite reports a local URL. Open it in the real browser, verify default reference-like Central output, all five mode changes, Rectangle/Rounded/Circle masks, timeline play/scrub, width/height controls, and PNG export.

### Task 9: Article-Grounded WebGL Refraction Correction

**Files:**
- Modify: `src/app/dispersion/dispersion-draw.ts`
- Create: `src/app/dispersion/dispersion-webgl.ts`
- Modify: `src/app/dispersion/dispersion-renderer.tsx`
- Modify: `src/app/dispersion/dispersion-renderer.module.css`
- Modify: `src/app/dispersion/dispersion-product.test.ts`
- Modify: `src/app/app-acceptance-data.ts`
- Modify: `src/app/app-verification-impact.json`
- Modify: `e2e/dispersion-export-proof.ts`
- Modify: `e2e/dispersion-canvas-proof.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] **Step 1: Capture the visual mismatch**

Run the existing app at the default Central settings, pause near phase 0, and capture the product surface. Compare it to extracted reference frames 01, 06, 12, and 18. Record the screen-only washout, missing dark glass volume, oversized pastel ribbons, insufficient RGB saturation, and uniform sinusoidal geometry.

- [ ] **Step 2: Add a failing reference-facing browser proof**

Sample the default Central canvas at a fixed phase and require a dark volume below the neutral background luminance, a compact near-white caustic, localized high-chroma pixels, and a chromatic region materially narrower than the glass body. Preserve existing control-output evidence and loop-seam tests.

- [ ] **Step 3: Implement the bounded WebGL2 shader engine**

Create one retained WebGL2 context with `preserveDrawingBuffer`. Draw a procedural neutral scene into a reusable framebuffer, then draw the optical composite. Use screen-space UVs, periodic signed-distance geometry, finite-difference normals, `refract`, six channel-specific IOR samples, a fixed multisample loop, RYGCBV reconstruction, luminance saturation, Blinn–Phong specular, Fresnel, and shader masks. Clamp the scene framebuffer long edge to a bounded internal resolution while retaining analytic full-resolution output.

- [ ] **Step 4: Map the existing product controls to shader uniforms**

Map Height to glass thickness/normal height, Refraction to base IOR and displacement, Spread to IOR separation, Softness to multisample aperture and volume falloff, Bend to fold curvature, Intensity to spectral saturation, Glow to specular/Fresnel energy, and Motion values to periodic fold and micro-normal coefficients. Keep fixed sample cardinality and exact progress 0/1 equality.

- [ ] **Step 5: Integrate live preview and deterministic export**

Replace the live 2D context path with the retained shader engine while continuing to consume `useToolcraftProductSceneFrame`, DPR, render scale, timeline state, and viewport interaction coalescing. Register the active renderer for export; render the requested target size into the mounted WebGL canvas, copy it into the runtime-supplied 2D context, then invalidate live preview. Use the existing Canvas 2D draw only as a WebGL-unavailable fallback. Update background acceptance for surface style plus decoded artifact pixels and retain discrete-slider evidence.

- [ ] **Step 6: Update renderer technique and verification ownership**

Change performance technique metadata from Canvas 2D to WebGL preview with composited 2D artifact delivery, document the fixed shader sample count and export-copy risk, and add one retained shader-resource pass beside the preview and export passes. Update verification impact for the new engine and shader-owned outcomes without creating measured performance authority.

- [ ] **Step 7: Verify four phases in a real browser**

Capture phases 0, 0.25, 0.5, and 0.75 from the product surface and inspect them against the storyboard. Also verify Edge Glass, Circle/Rounded clipping, background toggle, exact 2× backing, and PNG output.

- [ ] **Step 8: Run delivery checks**

Run `pnpm typecheck`, `pnpm ai:check`, focused Vitest, and focused browser acceptance during development. At the coherent boundary run bare `npm run verify:delivery`, then keep `npm run dev` serving the final product. Do not run measured performance or `npm run verify:perf`.

## Plan Self-Review

- Spec coverage: every frame, optics, color, motion, timeline, export, persistence, reference, acceptance, and verification requirement maps to a task above.
- Placeholder scan: no deferred implementation or unresolved product choice remains.
- Type consistency: `dispersionTargets`, `DispersionSettings`, `drawDispersionFrame`, pipeline pass IDs, acceptance IDs, and export action value are defined once and reused by schema, renderer, export, performance, and tests.

### Task 10: Clean Article-Accurate Mesh Dispersion Baseline

**Files:**
- Replace: `src/app/dispersion/dispersion-shaders.ts`
- Replace: `src/app/dispersion/dispersion-webgl.ts`
- Modify: `src/app/dispersion/dispersion-values.ts`
- Modify: `src/app/dispersion/dispersion-schema-sections.ts`
- Modify: `src/app/dispersion/dispersion-renderer.tsx`
- Modify: `src/app/dispersion/dispersion-export.ts`
- Modify: `src/app/app-acceptance-data.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-verification-impact.json`
- Modify: `src/app/dispersion/dispersion-product.test.ts`
- Replace: `e2e/dispersion-reference-fidelity.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] **Step 1: Remove the reproduced non-optical layers**

Delete the analytic ridge/height-field surface, direct spectral palette mix, upper/lower color lobes, painted shadow tint, and synthetic caustic from the primary WebGL path. Preserve the retained Toolcraft resource, exact backing dimensions, interaction coalescing, and active-provider export architecture.

- [ ] **Step 2: Implement the article render order with real geometry**

Use Three.js on the retained canvas to create one fixed perspective camera, a high-contrast monochrome source scene, closed refractive mesh presets, a reusable scene framebuffer, and a reusable back-face framebuffer. Render hidden-mesh scene → back faces → front faces. The glass shader uses geometry-derived view-space normals and eye vectors, sixteen fixed samples, separate R/Y/G/C/B/V IORs, the article reconstruction equations, luminance saturation, Blinn–Phong light, and Fresnel.

- [ ] **Step 3: Map controls to physical parameters**

Map Refraction to base displacement, Spread to wavelength-dependent IOR separation, Softness to the fixed multisample aperture, Height to mesh thickness/scale, Bend to mesh orientation/curvature presentation, Intensity to saturation, and Glow to specular/diffuse/Fresnel strength. Relabel the five persisted spectrum choices as physical IOR presets. Drive animation through periodic object and light transforms rather than 2D wave deformation.

- [ ] **Step 4: Preserve masks and deterministic export**

Keep Rectangle, Rounded, and Circle as output masks. Use CSS clipping for live preview and clip the runtime-supplied 2D export context before drawing the WebGL snapshot. Never allocate an export canvas or encode/download product bytes.

- [ ] **Step 5: Replace video-facing proof with optical proof**

Assert the WebGL engine, a visible source scene, refraction displacement inside the mesh, chromatic edges constrained to glass, meaningful Refraction/Spread changes, materially reduced color separation for Achromatic, deterministic phase output, exact backing scale, mask transparency, and non-empty PNG/JPG export. Remove dark-ridge/caustic/video-phase metrics from this iteration.

- [ ] **Step 6: Align product metadata and verification ownership**

Update acceptance wording, renderer technique, fixed sixteen-sample cost, two-FBO pass description, control outcomes, and verification impact ownership. Keep layers disabled, playback timeline enabled, persistence slices unchanged, image export runtime-owned, and performance intent `ordinary-product-work`.

- [ ] **Step 7: Verify and deliver once**

Run `pnpm ai:check`, `pnpm typecheck`, focused Vitest, and the focused article-optics Playwright test while developing. Inspect screenshots in a real browser at default, high dispersion, and achromatic settings. At the coherent boundary run one bare `npm run verify:delivery`, then keep `npm run dev` running. Do not run measured performance.

### Task 11: Add Inside / Border Wave Distribution

**Files:**
- Modify: `src/app/dispersion/dispersion-values.ts`
- Modify: `src/app/dispersion/dispersion-schema-sections.ts`
- Modify: `src/app/dispersion/dispersion-shaders.ts`
- Modify: `src/app/dispersion/dispersion-webgl.ts`
- Modify: `src/app/dispersion/dispersion-pipeline.ts`
- Modify: `src/app/dispersion/dispersion-renderer.tsx`
- Modify: `src/app/app-schema.ts`
- Modify: `src/app/app-acceptance-data.ts`
- Modify: `src/app/app-performance.ts`
- Modify: `src/app/app-verification-impact.json`
- Modify: `src/app/dispersion/dispersion-product.test.ts`
- Modify: `e2e/product-dispersion.spec.ts`
- Replace: `e2e/dispersion-reference-fidelity.spec.ts`
- Modify: `docs/toolcraft/agent-worklog.md`

- [ ] **Step 1: Extend the normalized state model**

Add `dispersion.distribution` with `inside | border` and bounded Border targets for influence area, spot size, wave count, pulse, and turbulence. Default to `inside`, validate every value, raise the persistence version, and preserve all existing Inside defaults.

- [ ] **Step 2: Add the conditional Wave Mode section**

Add one built-in segmented control for Inside/Border and five Border-only built-in sliders. Keep the existing field, spectrum, motion, setup, and export controls; update descriptions so their meaning in Border is explicit. Export the matching section inventory and acceptance rows.

- [ ] **Step 3: Implement the perimeter shader branch**

Add a fullscreen Border shader based on the output-mask signed distance, a periodic perimeter coordinate, bounded moving spot masks, double-beat pulse, and deterministic value noise. Reuse the current palette and optical/motion uniforms. Rectangle, Rounded, and Circle must trace their true canvas mask, and Influence area must change cross-contour reach independently of core thickness.

- [ ] **Step 4: Integrate the retained renderer and pipeline**

Create one retained Border material/scene beside the unchanged Inside material/scene. Select the branch from normalized settings, reuse the existing internal-scale render target, snapshot, export provider, and loop progress, and add all new targets to canonical invalidation without adding a pass or dependency.

- [ ] **Step 5: Align acceptance, performance metadata, and ownership**

Add the new section and controls to product readiness, transfer fixture language, pipeline metadata, and verification impact. Describe Inside as the fixed 38-step raymarch and Border as a constant-loop SDF/spot shader. Keep layers disabled, timeline playback enabled, and image export runtime-owned.

- [ ] **Step 6: Prove both branches in a real browser**

Verify that default Inside pixels remain stable; switch to Border and prove energy concentrates near the perimeter; vary Influence area and every Border parameter; compare Rectangle, Rounded, and Circle; inspect timeline movement/seam; and export the current Border frame. Capture Rounded and Circle screenshots for visual review.

- [ ] **Step 7: Deliver once**

Run `pnpm ai:check`, `pnpm typecheck`, focused Vitest, and focused Playwright during development. At the coherent boundary run one bare `npm run verify:delivery`, then start/keep `npm run dev`. Do not run measured performance or `npm run verify:perf`.
