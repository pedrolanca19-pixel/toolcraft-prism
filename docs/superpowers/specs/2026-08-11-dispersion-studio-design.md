# Dispersion Studio — Product Design

Date: 2026-08-11

## Goal

Build a Toolcraft product for authoring animated chromatic dispersion inside an adjustable finite canvas. The user can choose a rectangular, rounded, or circular output mask; tune the optical field; select several spatial dispersion modes; scrub and play a seamless loop; and export the current frame as PNG or JPG.

## Reference Study

Reference: `/Users/kusnizza/Desktop/CleanShot 2026-08-11 at 09.25.06.mp4`.

The 18.4-second, 4096×1904 H.264 recording was inspected at its nominal 60 fps. One-second frames and a 4×5 contact sheet were extracted to `.toolcraft/browser-artifacts/reference-video/`. Detailed frames at approximately 0, 5, 11, and 17 seconds were inspected at source-derived resolution.

The visible effect is a light-gray field split by a narrow, high-energy caustic ridge. The ridge deforms continuously from a shallow central S curve into a crest, crossing, trough, and rising diagonal. Cyan/blue, magenta/red, yellow/orange, and white components do not move as one painted gradient: they separate around the ridge, exchange dominance, and merge again. A wide, low-opacity bloom extends above and below the ridge while the canvas, crop, and neutral background remain stable.

Storyboard:

- 0s: nearly horizontal ridge with a compact upward step near the center; violet/cyan trail on the left and warm-to-cyan line on the right.
- 5s: broader central crest; cool translucent lower lobe and warm thin right edge.
- 11s: crossing profile with a bright white/cyan center and yellow/orange left band; large muted violet upper lobe.
- 17s: pronounced rising diagonal; cyan-white left line transitions through a small warm crest into a magenta/yellow right lobe.

Transition analysis:

- 0→5s: the narrow step expands into a crest; chromatic channels separate vertically while the broad haze grows below it.
- 5→11s: the crest flattens and crosses the center; warm/cool dominance swaps sides without a cut or retarget.
- 11→17s: the crossing turns into a rising diagonal; the white ridge stays continuous while magenta, yellow, and cyan lobes migrate around it.
- Across the recording: spatial anchors, output frame, and background remain fixed; only the procedural field phase and spectral separation evolve.

Behavior to preserve:

- one continuous caustic ridge rather than independent blobs;
- layered spectral separation plus a neutral white highlight;
- broad translucent bloom on both sides of the ridge;
- smooth, forward-only motion with no ping-pong reversal;
- stable frame and background throughout the loop.

## Product Behavior

The product starts with a 1920×1080 canvas and an animated Central field close to the reference. Runtime Setup owns aspect ratio, width, height, resolution scale, background, Infinity canvas, settings transfer, and timeline visibility.

Frame controls:

- Shape: Rectangle, Rounded, Circle.
- Corner radius: visible only for Rounded; it clips the product output rather than adding a shape inside the canvas.

Dispersion field controls:

- Mode: Central, Edge Glass, Halo, Diagonal, Ripple.
- Position: vertical location for Central/Diagonal/Ripple or radial bias for Halo.
- Edge inset: distance from the frame boundary; most visible in Edge Glass and Halo.
- Height: thickness of the refractive band or rim.
- Refraction: spatial separation of spectral channels.
- Spread: width of the translucent chromatic lobes.
- Softness: blur and falloff around the energetic ridge.
- Bend: curvature of the ridge or rim perturbation.

Color controls:

- Spectrum: Prism, Aurora, Sunset, Ice, Mono.
- Intensity: spectral saturation/opacity.
- Glow: white caustic and soft-light contribution.
- Background color: standard Toolcraft background pair, moved by runtime into Setup.

Motion controls:

- Flow: travel amount along the field.
- Undulation: amplitude of the seamless spatial deformation.
- Detail: secondary harmonic complexity.
- Shimmer: animated spectral phase offset.
- Seed: deterministic phase variation.

The upper Toolcraft playback timeline owns play/pause, scrubbing, duration, and looping. The initial duration is eight seconds, chosen as a product-derived balance between the slow reference flow and practical preview iteration. Changing duration changes loop length only. The renderer uses periodic sine/cosine harmonics so progress 0 and 1 match exactly.

## Interaction Ownership

All authoring operations use built-in panel controls because exact values, reset, persistence, and export parity matter more than direct manipulation. The canvas remains product output plus runtime pan/zoom; it contains no duplicated field handles or app UI. The scene is non-spatial 2D, so no orientation gizmo is present.

## Renderer

Use one retained WebGL2 canvas with a bounded two-stage shader renderer derived from Maxime Heckel's refraction and dispersion article. The renderer first produces a neutral procedural scene texture in an internal framebuffer, then composites a refractive glass field into the visible target. The optical shader uses screen-space coordinates, device-pixel-aware resolution, a finite-difference surface normal, `refract(...)`, separated indices of refraction, fixed-count multisampling, six RYGCBV spectral components, luminance-based saturation, Blinn–Phong-style lighting, and Fresnel response.

Central, Diagonal, and Ripple modes use a localized periodic fold rather than a full-width sine. Edge Glass uses the signed distance to an inset rounded perimeter. Halo uses an ellipse-distance field. The same shader uniforms and deterministic loop phase drive live preview and current-frame export. Rectangle, Rounded, and Circle are output masks in the fragment shader and in the host surface clipping, not figures placed inside the canvas.

The procedural framebuffer is necessary because refraction of a perfectly uniform color would be invisible. It contains the selected neutral background, a restrained luminance gradient, and a compact source caustic aligned to the current optical field. The composite shader refracts this scene separately for red, yellow, green, cyan, blue, and violet samples, reconstructs RGB, then adds dark transmitted volume, specular light, and Fresnel edge energy. This keeps the reference's dark glass body, narrow white caustic, and localized saturated edges instead of a pastel additive wash.

The runtime-owned image export still supplies the destination 2D context and encoder. The product reuses the mounted WebGL renderer to draw one deterministic frame at the requested backing size, copies those pixels into the supplied context, and immediately invalidates the preview for restoration. It does not allocate an export canvas, encode a blob, or create a download URL. A bounded Canvas 2D fallback remains only for environments where WebGL2 cannot be created.

The canonical Toolcraft pipeline has one retained shader-resource pass plus two product-visible passes: a per-frame preview composite and a batch image-export composite. Internally each render invocation performs one procedural-scene draw and one optical-composite draw. Canvas dimensions and export long edge are the meaningful pixel workloads; shader sample count is fixed and field controls change coefficients without changing cardinality.

## Export And Persistence

Image export is enabled with standard Toolcraft PNG/JPG format and 2K/4K/8K resolution controls. Video export is not enabled because the request asks for animated behavior, not a delivered video artifact. The runtime-owned export action invokes one deterministic `exportRenderer` for the current timeline frame.

Workspace persistence uses localStorage with values, canvas, panels, and timeline slices. Layers and media are omitted because the product has one procedural output and no source upload workflow.

## Acceptance

Automated and browser acceptance must prove:

- canvas sizing, resolution backing, Infinity mode restoration, settings transfer, and persistence;
- all three output masks, including radius applicability;
- each dispersion mode changes rendered pixels;
- position, inset, height, refraction, spread, softness, bend, spectrum, intensity, glow, and motion settings each change the visible output;
- the timeline can play, pause, scrub, change duration, and preserve a seamless forward-only loop;
- background inclusion changes preview and image export correctly;
- PNG/JPG settings and the runtime export action produce non-empty artifacts;
- the extracted reference behaviors map to the Central mode, spectral separation, glow, and continuous loop acceptance rows.

## Error Handling And Boundaries

The renderer clamps non-finite runtime values to schema domains and skips drawing when the product scene frame is empty or unavailable. Export throws a concise error only if a 2D context is unavailable. The app does not allocate export canvases, encode blobs, create object URLs, write storage directly, or render custom editor controls.

## Verification Tier

Verification tier: broad renderer/schema scope

Reason: This is the first complete product delivery and adds schema, timeline, custom raster renderer, export callback, acceptance coverage, performance ownership, persistence, and browser-visible behavior.

Run: `pnpm ai:check`; focused Vitest and browser checks during development; one bare `npm run verify:delivery` at the coherent boundary; then `npm run dev` and a real-browser visual/interaction check.

Skip: Measured performance and `npm run verify:perf`, because the request contains no performance complaint or explicit complete-audit authority. Video artifact verification is omitted because video export is not requested.

## Self-Review

## Visual Parity Correction — Shader Refraction And Dispersion

The first implementation reproduced the requested controls and motion topology but failed the reference visually: a screen-only stack on a near-white background produced low-contrast pastel ribbons, and the uniform harmonic path read as a sine wave rather than a refractive fold.

The user then supplied Maxime Heckel's article, `https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/`, as implementation authority. Its examples establish the required optical sequence: render the scene to a framebuffer, derive incident and normal vectors, refract screen-space samples with channel-specific IOR values, multisample those offsets, reconstruct a broader six-channel RYGCBV spectrum, saturate from luminance, and add specular plus Fresnel response.

The corrected Central output therefore uses four visually distinct contributions generated in the optical shader:

1. a broad, asymmetric neutral glass shadow occupying roughly 25–35% of the frame height;
2. muted warm/cool volume haze around the fold;
3. narrow, saturated cyan/magenta/yellow channel edges separated by refraction;
4. a continuous white caustic and restrained bloom occupying roughly 1–2% and 6–12% of frame height respectively.

Dark volume is transmitted/reflected shader energy, not a black painted stroke. Spectral edges come from spatially separated refracted samples rather than independently blurred paths. The narrow source caustic in the procedural scene texture gives those samples enough luminance contrast to split visibly even when the selected background is a flat light gray. The final highlight combines bounded specular and Fresnel terms instead of applying `screen` to every layer.

Central, Diagonal, and Ripple geometry replaces the uniform full-width sine with a signed-distance field around a periodic localized fold made from a moving smooth step, crest/trough envelopes, and low-amplitude secondary detail. Timeline progress remains periodic, so frames 0 and 1 still stitch exactly. Edge Glass and Halo use their own distance fields but share the same refractive sampling, lighting, spectrum, and caustic model.

Visual acceptance compares the default Central frame at four loop phases against the extracted storyboard. It must preserve a stable neutral background, a dark glass volume, a narrow high-energy white ridge, saturated but spatially limited RGB separation, localized step/crest/crossing/diagonal evolution, and no whole-frame pastel wash. Browser proof additionally requires measurable luminance contrast, chroma concentrated near the ridge, and a caustic materially thinner than the broad glass volume.

Verification tier remains broad renderer/schema scope because this correction rewrites the primary renderer composition and reference-facing motion geometry. Development runs focused draw/model tests and browser phase captures; delivery runs one protected functional gate. Measured performance remains skipped because the complaint concerns visual fidelity, not speed.

The design contains no placeholders or unresolved product decisions. The chosen controls map to one renderer/export state model; the animation and timeline choices are consistent; no requested feature requires a second subsystem or user clarification. The directory is not a Git repository, so the specification is saved locally without a commit.

## Article Baseline Reset — Real Mesh Optics Before Video Styling

The user explicitly rejects the reference-video matching direction for this iteration. The CleanShot recording is not a visual acceptance target until a clean optical baseline exists. The only rendering authority for this reset is Maxime Heckel's “Refraction, dispersion, and other shader light effects” article.

The current analytic field is the reproduced root cause of the dirty result: it combines `refract(...)` with a signed-distance ridge, manually tinted spectral bands, palette interpolation, broad upper/lower color lobes, painted shadow subtraction, and a synthetic white caustic. Those contributions are removed from the primary WebGL path rather than retuned.

The replacement uses an actual triangulated glass mesh and the article's ordered render sequence:

1. render a neutral, high-contrast test scene with the glass hidden into a scene framebuffer;
2. render the glass back faces into a second framebuffer while sampling the scene framebuffer;
3. render the glass front faces to the visible target while sampling the back-face framebuffer;
4. in both glass passes derive eye and surface-normal vectors from mesh geometry, refract sixteen samples with separate R/Y/G/C/B/V IOR values, reconstruct RGB, apply luminance saturation, then add only Blinn–Phong diffuse/specular and Fresnel energy.

The default Central preset is a rounded icosahedral lens similar to the article demo. Other existing modes select real closed mesh variants rather than 2D ridge functions. The visible background is a monochrome optical test scene; any spectrum appearing in the glass therefore comes from channel-specific refraction of scene contrast, never from a palette overlay. Existing spectrum values remain persistence-compatible but are relabeled as Article, Crown glass, Flint glass, Diamond, and Achromatic IOR presets.

Timeline motion changes mesh orientation and the light vector with a periodic camera-relative transform. Frame masks remain output clipping owned by the host surface and export context; they are not refractive geometry. Live preview and still export continue sharing the retained renderer resource and exact Toolcraft backing-size contract.

Acceptance for this reset proves a crisp source scene outside the mesh, spatial displacement inside the mesh silhouette, view-dependent front/back highlights, chromatic separation that changes with IOR spread, an achromatic preset with materially reduced channel separation, deterministic timeline rendering, transparent masked PNG corners, and preview/export parity. It explicitly rejects direct palette uniforms, analytic ridge/lobe functions, general Gaussian blur, and video-frame silhouette matching.

Verification tier: broad renderer/schema scope

Reason: the primary renderer, optical state mapping, visible control meaning, browser acceptance, export clipping, renderer metadata, and worklog authority all change together.

Run: `pnpm ai:check`; `pnpm typecheck`; focused product Vitest; focused article-optics Playwright checks and visual screenshots; one bare `npm run verify:delivery` at the coherent boundary; then keep `npm run dev` serving the verified result.

Skip: measured performance and `npm run verify:perf`, because this is a rendering-correctness complaint rather than a localized performance request. CleanShot parity is deferred by explicit user direction.

## Single Wave Distribution

The product exposes only the canonical Cartesian 38-step raymarched light sheet. The former `Wave mode` selector, closed-perimeter Border branch, Border-only controls, Paper Pulsing Border adapter, and associated persistence/acceptance paths are removed.

Rectangle, Rounded, and Circle remain output masks. Position moves the sheet vertically; Frame margin controls edge fade; Thickness, Refraction, Spread, Sample spread, Chromatic split, Tilt, Spectrum, Glow, Sparkle, Grain, Lens Distortion, and timeline motion keep their existing central-field meanings. Preview and still export use the same retained WebGL material and deterministic loop phase.

The persistence schema version advances so a workspace saved while Border was selected cannot restore a removed branch. Settings import may contain obsolete keys, but the current schema ignores them and renders the canonical field.

Verification scope: renderer/canvas/runtime feature

Reason: the visible schema and retained renderer lose a complete topology branch while the remaining optical field, animation, effects, and export architecture stay unchanged.

Run: focused TypeScript/Vitest and browser checks; one bare `npm run verify:delivery`; then keep `npm run dev` serving the verified result.

Skip: measured performance and `npm run verify:perf`; the request is a functional mode removal, not performance authority.
