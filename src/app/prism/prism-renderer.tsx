import * as React from "react";

import { getToolcraftTimelineLoopProgress } from "@/toolcraft/runtime";
import {
  useToolcraft,
  useToolcraftMediaPresentationUrls,
  useToolcraftPipeline,
  useToolcraftProductSceneFrame,
} from "@/toolcraft/runtime/react";

import { createPrismGl, tryCreatePrismGl, type PrismGl } from "./prism-gl";
import {
  decodePrismMask,
  getPrismMaskSource,
  PRISM_MASK_IMAGE_TARGET,
  setPrismMaskSource,
  subscribePrismMaskSource,
} from "./prism-mask-source";
import { prismPipelinePasses } from "./prism-pipeline";
import styles from "./prism-renderer.module.css";
import { readPrismSettings } from "./prism-settings";

const VIEWPORT_SETTLE_MS = 90;

function readRenderScale(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(2, Math.max(1, numeric)) : 2;
}

/** Live preview: one WebGL2 canvas sized to the product scene frame. */
export function PrismRenderer(): React.JSX.Element {
  const { state } = useToolcraft();
  const pipeline = useToolcraftPipeline();
  const sceneFrame = useToolcraftProductSceneFrame();
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const stateRef = React.useRef(state);
  const frameRef = React.useRef(sceneFrame);
  const dirtyRef = React.useRef(true);
  const settleUntilRef = React.useRef(0);

  stateRef.current = state;
  frameRef.current = sceneFrame;
  dirtyRef.current = true;

  // The uploaded mask image: decoded once per file and transform, shared with the export renderer.
  const maskUrls = useToolcraftMediaPresentationUrls(state.mediaAssets);
  const maskAsset = state.mediaAssets.find(
    (asset) =>
      asset.assetKind === "image" &&
      asset.sourceTarget === PRISM_MASK_IMAGE_TARGET &&
      asset.lifecycle !== "unavailable",
  );
  const maskImage = maskAsset?.assetKind === "image" ? maskAsset : undefined;
  const maskUrl = maskImage ? maskUrls.get(maskImage.id) : undefined;
  const maskTransform = maskImage?.transform;
  const maskKey = maskImage && maskUrl
    ? [
        maskImage.id,
        maskImage.resourceRef,
        maskTransform?.rotationDeg ?? 0,
        maskTransform?.flipHorizontal === true,
        maskTransform?.flipVertical === true,
      ].join(":")
    : "";

  React.useEffect(() => {
    if (!maskKey || !maskUrl) {
      setPrismMaskSource(null);
      return;
    }
    const controller = new AbortController();
    void decodePrismMask(maskUrl, maskTransform, controller.signal)
      .then((bitmap) => {
        if (controller.signal.aborted) bitmap.close();
        else setPrismMaskSource(bitmap);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPrismMaskSource(null);
      });
    return () => controller.abort();
    // maskKey already encodes the asset, its resource and its transform.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maskKey, maskUrl]);

  React.useEffect(
    () =>
      subscribePrismMaskSource(() => {
        dirtyRef.current = true;
      }),
    [],
  );

  React.useEffect(() => {
    settleUntilRef.current = performance.now() + VIEWPORT_SETTLE_MS;
  }, [state.canvas.offset.x, state.canvas.offset.y, state.canvas.zoom]);

  React.useEffect(() => {
    if (!canvas) return;
    let active = true;
    let frameHandle = 0;
    let owned: PrismGl | null = null;
    const create = (): PrismGl => createPrismGl(canvas);
    const dispose = (resource: PrismGl): void => resource.dispose();
    const fail = (error: unknown): void => {
      if (active) setFailure(error instanceof Error ? error.message : "WebGL2 initialization failed.");
    };

    const start = (gl: PrismGl): void => {
      if (!active) return;
      setFailure(null);
      dirtyRef.current = true;
      const tick = (now: number): void => {
        if (!active) return;
        const current = stateRef.current;
        const rect = frameRef.current.rect;
        const interacting = now < settleUntilRef.current;
        if (rect && !interacting && (dirtyRef.current || current.timeline.isPlaying)) {
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const renderScale = readRenderScale(current.values["canvas.renderScale"]);
          const zoomScale = Math.max(0.01, current.canvas.zoom / 100);
          const backing = dpr * renderScale * zoomScale;
          const settings = readPrismSettings(current.values);
          const progress = getToolcraftTimelineLoopProgress(current.timeline);
          const render = (): void => {
            gl.setMask(getPrismMaskSource());
            gl.render({
              height: Math.max(2, Math.round(rect.height * backing)),
              includeBackdrop: settings.includeBackground,
              progress,
              settings,
              width: Math.max(2, Math.round(rect.width * backing)),
            });
            canvas.dataset.prismProgress = progress.toFixed(6);
            canvas.dataset.timelineProgress = progress.toFixed(6);
            canvas.dataset.prismPalette = settings.palette;
            canvas.dataset.prismMask = settings.maskType;
            canvas.dataset.renderScale = String(renderScale);
          };
          if (pipeline) {
            void pipeline.runPass(prismPipelinePasses.previewFrame, undefined, render);
          } else {
            render();
          }
          dirtyRef.current = false;
        }
        frameHandle = requestAnimationFrame(tick);
      };
      frameHandle = requestAnimationFrame(tick);
    };

    if (pipeline) {
      void pipeline
        .runPass(
          prismPipelinePasses.shaderResource,
          { "canvas.element": canvas },
          (context) => context.getOrCreateResource([canvas], create, dispose),
        )
        .then(start)
        .catch(fail);
    } else {
      const result = tryCreatePrismGl(canvas);
      if ("gl" in result) {
        owned = result.gl;
        start(owned);
      } else {
        setFailure(result.message);
      }
    }

    return () => {
      active = false;
      cancelAnimationFrame(frameHandle);
      owned?.dispose();
    };
  }, [canvas, pipeline]);

  const rect = sceneFrame.rect;
  return (
    <div
      aria-label="Animated prismatic light sheet"
      className={styles.surface}
      data-prism-surface="true"
      data-toolcraft-product-output="true"
      style={{
        height: rect ? `${rect.height}px` : "100%",
        width: rect ? `${rect.width}px` : "100%",
      }}
    >
      <canvas
        className={styles.canvas}
        data-prism-canvas="true"
        data-prism-engine={failure ? "unavailable" : "webgl2"}
        data-prism-error={failure ?? undefined}
        ref={setCanvas}
      />
    </div>
  );
}
