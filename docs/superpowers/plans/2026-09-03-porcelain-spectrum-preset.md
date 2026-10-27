# Porcelain Spectrum Preset — Implementation Plan

Date: 2026-09-03

Request (Vlad): «мне надо чтобы был цветовой пресет в стиле цветов что я тебе прислал. То есть мы не правим механику, а только создаём гамму, которая схожа с моим референсом.»

Reference input: one photo supplied in chat — a white ribbed Calatrava-style ceiling (Oculus-like) lit from above: sky-blue tinted white at the top fading into warm ivory at the bottom, with cool grey rib shadows and a small bird for scale. A reference/candidate board with extracted swatches is saved beside this plan as `.toolcraft/browser-artifacts/porcelain-preset-board.png`.

## Verification Note

Verification tier: Tier 2 — schema/product behavior

Reason: one new option in the existing `Spectrum` select plus one new row in the fixed palette preset table and its acceptance coverage. No new targets, uniforms, passes, controls, sections, persistence slices, or renderer code; the WebGL path consumes the new entry through the same `uPalettePhase` / `uPaletteBase` / `uPaletteAmp` / `uChroma` uniforms it already reads.

Run: focused Vitest (`src/app/dispersion/dispersion-product.test.ts`, `src/app/app-schema.test.ts`, the supplied `app-acceptance.*` meta-tests), `pnpm typecheck`, `pnpm ai:check`, a scratch Playwright probe that screenshots the real WebGL canvas with the new preset selected, then one bare `npm run verify:delivery` at the coherent boundary and `npm run dev` for a real-browser look.

Skip: measured performance and `npm run verify:perf` — the preset changes palette coefficients only; sample count, passes, and workload dimensions are untouched.

## Goal

Add one built-in `Spectrum` option whose palette reads like the reference: a high-key, almost achromatic sheet that drifts between two tones only — a cool periwinkle/sky blue in the haze and a warm ivory/cream near the lit core — with neutral grey in between and no rainbow banding. Everything else (march, waves, glow, grain, lens, timeline, export, persistence) stays exactly as it is.

## Reference Study (numeric)

Measured on the supplied 1100×1551 photo (sRGB):

- Two hue families only. Cool family: H ≈ 219–222°, S 20–38 %, V 63–84 % (`#A4B4D6` ≈ 14 % of pixels, `#7E95C1` ≈ 13 %). Warm family: H ≈ 40–47°, S 3–7 %, V 83–98 % (`#ECEAE4` ≈ 35 %, `#D3D2D0` ≈ 26 %, highlights `#F9F5E7`–`#FCFAF4`).
- Vertical drift, top → bottom: band means go `#99A8C9` → `#B9C0CC` → `#CFCFD0` (neutral at 55 % height) → `#E1DDD9`. The warm/cool index `(R+G)/2 − B` runs from −41 at the top to +6 at the bottom: one smooth cool→warm transition, not repeating bands.
- Shadows are neutral-cool greys, not saturated: rib shadows `#A3A4AA`, `#8D8D95`, deepest `#666771`. Highlights are warm near-white.
- Overall saturation is very low: HSV S median 7 %, P90 32 %. Mean V ≈ 84 %.

What this means for the palette model (`base + amp · cos(d·freq + phase)`, then `chroma` mix): keep `base` bright (≈ 1), make red/green swing together while blue barely moves, so the cycle only alternates ivory ↔ periwinkle through neutral; keep blue slightly counter-phased so the ivory pole is not blue-tinted and the periwinkle pole gains a little blue; keep `chroma` at 1 and let the small amplitudes carry the desaturation.

## Product Decision

- One new `Spectrum` option, value `porcelain`, label `Porcelain` (see Open decisions for the name). It joins the fixed preset table between `ice` and `dusk` in the visible list so the cool options sit together.
- Palette-only. The option maps to the existing preset uniforms; no shader edit, no new control, no new target, no persistence version bump (`readChoice` already falls back to `prism` for unknown values, and the existing stored values stay valid — same treatment as the Dusk addition in iteration 11).
- Built-in presets stay single-cosine (`amp2` omitted), `amp ≤ base` on every channel so the palette never subtracts light, and the entry is documented in the same one-line style as the other presets.
- The reference look also depends on controls the preset does not own (Background, Spread, Sample spread, Thickness, Shading, Glow). Those stay user-adjustable; the recommended companion values are recorded in the worklog and in the preset comment as a recipe, not enforced in code and not changed as defaults (changing `DISPERSION_DEFAULTS` would alter Reset for every existing workspace).

## Proposed Starting Values

```ts
/** High-key two-tone from the supplied ribbed-ceiling photo: ivory highs, periwinkle lows, neutral between. */
porcelain: {
  amp: [0.31, 0.24, 0.05],
  base: [0.93, 0.98, 1.05],
  chroma: 1,
  phase: [Math.PI, Math.PI, 0],
},
```

Real-renderer check (2026-09-03, dev server, Custom anchors below): at Light travel 52 the periwinkle pole sits on the sheet core (blue ridge on cream); at Light travel 77 the periwinkle becomes the atmosphere above the sheet and the core/near glow turn ivory — the photo's arrangement. The `[π, π, 0]` phase above is the `[π/2, π/2, 3π/2]` fit rotated by that `+π/2` (`(77 − 52)/100 · 2π`), so the built-in preset shows the verified orientation at the default Light travel.

Derivation:

- Poles of the cycle (palette multipliers, reference-neutral = 1): ivory `base + amp·(1, 1, −1)` = `[1.24, 1.22, 1.00]` (normalized `#FFFBCE`, warm, low chroma); periwinkle `base − amp·(1, 1, −1)` = `[0.62, 0.74, 1.10]` (normalized `#90ACFF`); mean `[0.93, 0.98, 1.05]` is a cool near-white, matching the neutral middle of the photo. Mean gain ≈ 0.99, so brightness stays in line with Prism/Aurora/Sunset and Glow keeps its meaning.
- Live preview before any code change: the same palette is reproducible today through `Spectrum → Custom` with Color 1 `#777D86`, Color 2 `#4F5E8C`, Color 3 `#777D86`, Color 4 `#9E9C80` plus Light travel 77 (the four-anchor Fourier fit returns `amp ≈ [0.31, 0.24, 0.05]`, `base ≈ [0.93, 0.98, 1.05]`, `amp2 ≈ 0`, phase `[π/2, π/2, 3π/2]`; Light travel 77 adds the `+π/2` baked into the preset above). Equivalent at the default Light travel 52: Color 1 `#4F5E8C`, Color 2 `#777D86`, Color 3 `#9E9C80`, Color 4 `#777D86`.

Companion recipe, verified in the real renderer (documentation only, user-adjustable; also saved as `dispersion-studio-settings.json` in the project root (an unmodified app export; note the transfer `appId` resolves to `identity.id` = `dispersion`, not the schema's legacy `dispersion-studio`) for `Import Settings`): Background `#ECEAE4` (the photo's dominant ivory), Spread 20 (one cool→warm transition across the depth instead of repeating bands), Sample spread 70 (clean gradient, no smoky texture), Thickness 44, Shading 35 (grey rib-like shadow on the sheet's slopes), Glow 48 (58 and above blows the core out to a hot white band), Saturation at default, Light travel 77 with the Custom anchors (52 once the preset is built in). Everything at defaults also works; it just shows more bands and a bluer core.

## Files

- `src/app/dispersion/dispersion-values.ts` — extend the `DispersionSpectrum` union, add the `porcelain` row to `DISPERSION_SPECTRUM_PRESETS` (keys are kept alphabetical, so it lands between `mono` and `prism`; the `Record<DispersionSpectrumPresetName, …>` type stays exhaustive), add `"porcelain"` to `SPECTRUM_VALUES` in visible order (after `"ice"`). File is at 673 lines against the 700-line `src/app/` budget: add the entry compactly, no long comment blocks.
- `src/app/dispersion/dispersion-schema-sections.ts` — add `{ label: "Porcelain", value: "porcelain" }` to the `spectrum` select options (after Ice); optionally mention it in the control `description`.
- `src/app/app-acceptance-data.ts` — extend the `spectrum` row's `optionCoverage` with `"porcelain"` (the `control-acceptance-kind-rules` check fails otherwise: every visible select option must be covered) and update the observable prose that enumerates the presets. File is at 687/700 lines.
- `src/app/dispersion/dispersion-product.test.ts` — one focused test: `porcelain` is accepted by `readDispersionSettings`, the preset row keeps `amp ≤ base` per channel and `amp2` undefined, and the schema select options equal the preset table keys plus `custom` (guards the three lists from drifting).
- `docs/toolcraft/agent-worklog.md` — new `Iteration 34` Decision Trail entry (skeleton below).
- Scratch only, git-ignored: `.agents/porcelain-preset-probe.mjs` + `.agents/probe-shots/porcelain/` for real-canvas screenshots, following the existing `.agents/glass-mode-probe.mjs` pattern (own vite dev server on a fixed port, Playwright, canvas pixel stats).

No changes: `dispersion-webgl.ts`, `dispersion-shaders.ts`, `dispersion-light-sheet-core.ts`, `dispersion-pipeline.ts` (the `spectrum` target is already in the invalidation list), `app-schema.ts` (persistence version stays 9), `app-verification-impact.json` (`dispersion.spectrum` is already owned by both edited modules), `dispersion-section-inventory.ts`, e2e specs (the existing `Aurora` select proof stays the browser evidence for the control; optionally switch that label to `Porcelain`, but do not add a second test with the same acceptance id).

## Implementation Steps

1. Preflight per `AGENTS.md`: read `docs/toolcraft/workflow.md`, then the schema route Plan docs (`core/control-selection.md`, `core/layout.md`), the Implementation docs (`schema-reference.md`, `component-rules.md`) before editing, and `acceptance-testing.md` before proof.
2. Sign off the palette in the real renderer before coding: `npm run dev`, set `Spectrum → Custom` with the four anchors above, Background `#ECEAE4`, then the recipe values; compare against the photo at a few Light travel positions. Adjust the anchors if needed and derive the final `base`/`amp`/`phase` from them: with `A` = Color 4 (ivory pole) and `B` = Color 2 (periwinkle pole) as hex/255·2 multipliers, `base = (A + B)/2`, `amp = |A − B|/2`, and per channel `phase = π/2` where `A ≥ B`, else `3π/2` (that is what the four-anchor fit returns for the `mid, B, mid, A` anchor order — R/G get `π/2`, B gets `3π/2` for the proposed anchors). If the sign-off happened at a Light travel value `L` other than 52, add `(L − 52)/100 · 2π` to all three phases so the built-in preset shows the same orientation at the default Light travel.
3. Edit `dispersion-values.ts`: union member, preset row, `SPECTRUM_VALUES`. Keep the row's one-line doc comment in the existing style.
4. Edit `dispersion-schema-sections.ts`: add the option; keep `orderRole: "color"` and the responsiveness metadata untouched.
5. Edit `app-acceptance-data.ts`: `optionCoverage` and prose.
6. Add the focused unit test in `dispersion-product.test.ts`.
7. Run `pnpm typecheck`, `pnpm ai:check`, and the focused Vitest files (`vitest run src/app/dispersion/dispersion-product.test.ts src/app/app-schema.test.ts src/app/app-acceptance.base-coverage.test.ts` — the last one runs `validateProductAcceptanceCoverage()`, which is where a missing `optionCoverage` entry surfaces); `npm run test` for the docs/integrity/meta-test pass once the worklog entry exists.
8. Run the scratch probe (or check by hand in `npm run dev`): screenshots with `Porcelain` at defaults, with the recipe, and at four loop phases; confirm the frame reads as the two-tone photo palette (no rainbow bands, ivory core, periwinkle haze) and that the loop seam is unaffected. Save shots under `.agents/probe-shots/porcelain/`; none of this enters the receipt.
9. Write the worklog entry, then one bare `npm run verify:delivery`, then keep `npm run dev` serving the verified result. Commit with a message like `Add Porcelain spectrum preset from ribbed-ceiling reference`.

## Worklog Entry Skeleton (Iteration 34)

- Request: the user's quote above plus the supplied photo.
- Task type: product behavior iteration adding one fixed palette preset to the existing Spectrum select; palette-only, renderer untouched.
- User-visible result: `Spectrum` offers `Porcelain` — a high-key ivory ↔ periwinkle sheet with neutral greys and no rainbow banding; recommended companion recipe listed.
- Source/reference checked: the supplied photo (numeric palette above); the ported cosine palette line and iteration 11/12 preset and Custom-fit mechanics; CPU harness renders of candidate coefficients on the default frame and on the ivory background.
- Reference inputs: one still photo; no video, no Figma.
- Docs/contracts read: `workflow.md`; Plan `core/control-selection.md`, `core/layout.md`; Implementation `schema-reference.md`, `component-rules.md`; Verification `acceptance-testing.md`.
- Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`, `workflow-required`.
- View interaction intent: remains `non-spatial`. Interaction ownership: unchanged, panel-owned select.
- Decision: the coefficient triple and phase above; blue nearly flat and counter-phased; chroma 1; no default/background change; no persistence bump.
- Alternatives rejected: changing `DISPERSION_DEFAULTS.background` (alters Reset for every workspace); a bundled "look preset" mechanism that also sets Background/Spread/Shading (new schema surface, not requested); tuning via `chroma < 1` only (greys the whole cycle instead of shaping the two poles); a `custom`-only recipe (works today but forces users to retype four anchors).
- State/output mapping: `dispersion.spectrum = "porcelain"` selects the new row; `updateUniforms` writes it to `uPalettePhase`/`uPaletteBase`/`uPaletteAmp`/`uChroma` exactly as for the other presets; Spread, Light travel, Saturation, and Color Balance keep their meanings over it.
- Performance intent: ordinary-product-work; identical fixed-cost single pass; no measured-performance authority.
- Verification: one bare `npm run verify:delivery` derives and runs the protected proof.
- Risks: on light backgrounds the sheet is additive, so the periwinkle can only appear where the sheet's own light is strong enough to replace the backdrop — on the default `#E7E7EC` the blue reads paler than the photo unless Glow/Thickness are raised or the ivory background is used; the ivory pole is warmer than the photo's highlights by design because the white-hot core desaturates it on screen.

## Open Decisions (for Vlad)

1. Name: `Porcelain` (proposed; blue-white glazed feel) vs `Oculus` vs `Ivory`. Only the label/value string changes.
2. Whether the recommended background `#ECEAE4` should also become the schema default. Proposed: no — keep `#E7E7EC`, document the recipe.
3. Whether to switch the existing browser select proof from `Aurora` to `Porcelain`. Proposed: keep `Aurora`; the acceptance option coverage plus the unit test and the probe screenshots cover the new option.

## Evidence So Far

The starting coefficients were tuned in a CPU port of the field shader (same march, palette, composite, and uniform mapping as `dispersion-light-sheet-core.ts` / `dispersion-webgl.ts`, without grain, sparkle, or lens), then checked on the real WebGL canvas of the running dev server through `Spectrum → Custom` (the real renderer is noticeably brighter and more saturated than the port, which is why Glow landed at 48 rather than 64 and Light travel at 77). The palette anchors themselves did not need to change. Step 8 still owns the final screenshots after the option is built in.
