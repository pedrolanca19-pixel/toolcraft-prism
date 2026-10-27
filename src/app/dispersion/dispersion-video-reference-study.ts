import type { ToolcraftVideoReferenceStudyEvidence } from "../acceptance/types";
import { dispersionTargets } from "./dispersion-values";

function acceptanceId(target: string): string {
  return target.startsWith("dispersion.") ? target : `dispersion.${target}`;
}

/** Historical source study retained as evidence for the canonical light sheet. */
export const dispersionVideoReferenceStudy = {
  acceptanceMapping: [
    {
      acceptanceId: acceptanceId(dispersionTargets.mode),
      behavior:
        "Central mode preserves one continuous caustic ridge while additional modes remap the same optical vocabulary to edges, a halo, a diagonal, and coupled ripples.",
      frameIds: [
        "reference-start",
        "reference-crest",
        "reference-crossing",
        "reference-rise",
      ],
    },
    {
      acceptanceId: acceptanceId(dispersionTargets.refraction),
      behavior:
        "Cyan/blue, magenta/red, and yellow/orange channels separate around the white ridge and merge again as phase changes.",
      frameIds: ["reference-start", "reference-crossing", "reference-rise"],
    },
    {
      acceptanceId: acceptanceId(dispersionTargets.glow),
      behavior:
        "A narrow white energetic ridge remains embedded in broad translucent chromatic bloom above and below the field.",
      frameIds: ["reference-crest", "reference-crossing"],
    },
    {
      acceptanceId: acceptanceId("runtime.timeline.playback"),
      behavior:
        "The field evolves continuously with a stable frame and no cuts, retargeting, or reverse-direction ping-pong motion.",
      frameIds: [
        "reference-start",
        "reference-crest",
        "reference-crossing",
        "reference-rise",
      ],
    },
  ],
  behaviorDecomposition:
    "Preserve a stable neutral frame, one continuous procedural ridge, independent spectral offsets, a thin white caustic, broad two-sided bloom, and smooth forward phase evolution. Generalize the observed central S field into five spatial mappings while keeping the same optical layers and exact runtime timeline ownership.",
  extractionEvidence:
    "Inspected the complete 18.4-second 4096×1904 H.264 recording at nominal 60 fps. Extracted one-second frames and a 4×5 contact sheet into .toolcraft/browser-artifacts/reference-video, then inspected frames 01, 06, 12, and 18 individually at source-derived resolution.",
  referenceLocation:
    "/Users/kusnizza/Desktop/CleanShot 2026-08-11 at 09.25.06.mp4",
  storyboard: [
    {
      behaviorObservation:
        "The white ridge, channel offsets, and broad bloom share one continuous centerline while moving at different apparent phase offsets.",
      frameId: "reference-start",
      frameSource: ".toolcraft/browser-artifacts/reference-video/frame-01.jpg",
      timeSeconds: 0,
      visualObservation:
        "A near-horizontal ridge forms a compact upward step near center; violet/cyan trails left and a warm-to-cyan line extends right on light gray.",
    },
    {
      behaviorObservation:
        "The centerline expands smoothly rather than spawning a new object; warm and cool contributions remain attached to opposite sides of the ridge.",
      frameId: "reference-crest",
      frameSource: ".toolcraft/browser-artifacts/reference-video/frame-06.jpg",
      timeSeconds: 5,
      visualObservation:
        "A broad central crest sits over a cool translucent lower lobe with a thin warm right edge and soft neutral haze.",
    },
    {
      behaviorObservation:
        "Chromatic dominance swaps across the crossing while the white highlight stays continuous and the crop remains unchanged.",
      frameId: "reference-crossing",
      frameSource: ".toolcraft/browser-artifacts/reference-video/frame-12.jpg",
      timeSeconds: 11,
      visualObservation:
        "A bright white/cyan crossing is surrounded by a yellow-orange left band, cyan right band, and a large muted violet upper lobe.",
    },
    {
      behaviorObservation:
        "The same field rotates into a pronounced rising diagonal without a cut, reverse, or background change.",
      frameId: "reference-rise",
      frameSource: ".toolcraft/browser-artifacts/reference-video/frame-18.jpg",
      timeSeconds: 17,
      visualObservation:
        "A cyan-white left line passes a small warm crest and rises into a magenta/yellow right lobe over the stable neutral background.",
    },
  ],
  transitionAnalysis: [
    {
      behaviorDelta:
        "The compact step expands into a crest; channel separation grows vertically and the cool lower haze becomes wider while anchors and crop stay fixed.",
      fromFrameId: "reference-start",
      id: "step-to-crest",
      toFrameId: "reference-crest",
    },
    {
      behaviorDelta:
        "The crest relaxes into a crossing and warm/cool dominance exchanges sides without breaking the high-energy ridge.",
      fromFrameId: "reference-crest",
      id: "crest-to-crossing",
      toFrameId: "reference-crossing",
    },
    {
      behaviorDelta:
        "The crossing becomes a rising diagonal as magenta, yellow, and cyan lobes migrate around a persistent white centerline.",
      fromFrameId: "reference-crossing",
      id: "crossing-to-rise",
      toFrameId: "reference-rise",
    },
  ],
} satisfies ToolcraftVideoReferenceStudyEvidence;
