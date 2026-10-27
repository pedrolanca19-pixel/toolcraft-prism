import * as React from "react";
import { createPortal } from "react-dom";

import {
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime";
import {
  useToolcraft,
  useToolcraftPipeline,
  useToolcraftProductSceneFrame,
} from "@/toolcraft/runtime/react";

import { registerDispersionExportProvider } from "./dispersion-export";
import { dispersionPipelinePasses } from "./dispersion-pipeline";
import { readDispersionSettings } from "./dispersion-values";
import { useDispersionInfiniteViewport } from "./dispersion-infinite-viewport";
import { getDispersionViewWindow } from "./dispersion-view-window";
import {
  createDispersionGlResource,
  disposeDispersionGlResource,
  type DispersionGlResource,
} from "./dispersion-webgl";
import styles from "./dispersion-renderer.module.css";

function getRenderScale(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(2, Math.max(1, numeric)) : 2;
}

const LENS_LIVE_PREVIEW_INTERVAL_MS = 120;
const LENS_LIVE_PREVIEW_LEADING_DELAY_MS = 16;

export function DispersionRenderer(): React.JSX.Element {
  const { state } = useToolcraft();
  const pipeline = useToolcraftPipeline();
  const productSceneFrame = useToolcraftProductSceneFrame();
  const infiniteViewport = useDispersionInfiniteViewport();
  const viewportRef = React.useRef(infiniteViewport);
  viewportRef.current = infiniteViewport;
  const previewSettings = readDispersionSettings(state);
  const previewBackgroundIncluded = shouldIncludeToolcraftPreviewBackground({
    state,
  });
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
  const [glResource, setGlResource] =
    React.useState<DispersionGlResource | null>(null);
  const [initializationFailed, setInitializationFailed] = React.useState(false);
  const stateRef = React.useRef(state);
  const frameRef = React.useRef(productSceneFrame);
  const needsRenderRef = React.useRef(true);
  const renderVersionRef = React.useRef(0);
  const renderPendingRef = React.useRef(false);
  const renderedLensEnabledRef = React.useRef(false);
  const yieldedLensActivationRef = React.useRef(false);
  const controlSettleUntilRef = React.useRef(0);
  const lastExactRenderAtRef = React.useRef(0);
  const renderSettingsKeyRef = React.useRef("");
  const viewportInteractionUntilRef = React.useRef(0);
  const lastProgressRef = React.useRef<number | null>(null);
  const attachCanvas = React.useCallback((output: HTMLCanvasElement | null) => {
    canvasRef.current = output;
    setCanvas(output);
  }, []);

  const renderSettingsKey = JSON.stringify(previewSettings);
  if (renderSettingsKey !== renderSettingsKeyRef.current) {
    if (previewSettings.lens.enabled && renderedLensEnabledRef.current) {
      // Keep controls responsive while Lens is active, but still render during
      // the gesture. Every tick submits the newest full-quality composition;
      // stale intermediate values collapse into the next 120 ms slot.
      const now = performance.now();
      controlSettleUntilRef.current = Math.max(
        now + LENS_LIVE_PREVIEW_LEADING_DELAY_MS,
        lastExactRenderAtRef.current + LENS_LIVE_PREVIEW_INTERVAL_MS,
      );
    } else {
      controlSettleUntilRef.current = 0;
    }
    renderSettingsKeyRef.current = renderSettingsKey;
  }

  stateRef.current = state;
  frameRef.current = productSceneFrame;
  needsRenderRef.current = true;
  renderVersionRef.current += 1;

  React.useEffect(() => {
    if (!canvas) return;
    let active = true;

    const create = () => createDispersionGlResource(canvas);
    if (!pipeline) {
      try {
        const resource = create();
        setGlResource(resource);
        setInitializationFailed(false);
        return () => {
          active = false;
          setGlResource(null);
          disposeDispersionGlResource(resource);
        };
      } catch (error) {
        canvas.dataset.dispersionError =
          error instanceof Error ? error.message : "WebGL2 initialization failed.";
        setInitializationFailed(true);
        return () => {
          active = false;
        };
      }
    }

    void pipeline
      .runPass(
        dispersionPipelinePasses.shaderResource,
        { "canvas.element": canvas },
        (context) =>
          context.getOrCreateResource(
            [canvas],
            create,
            disposeDispersionGlResource,
          ),
      )
      .then((resource) => {
        if (!active) return;
        setGlResource(resource);
        setInitializationFailed(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        canvas.dataset.dispersionError =
          error instanceof Error ? error.message : "WebGL2 initialization failed.";
        setInitializationFailed(true);
      });

    return () => {
      active = false;
    };
  }, [canvas, pipeline]);

  React.useEffect(() => {
    if (!glResource) return;
    return registerDispersionExportProvider({
      snapshot: (frame) => glResource.snapshot(frame),
    });
  }, [glResource]);

  React.useEffect(() => {
    viewportInteractionUntilRef.current = performance.now() + 90;
    needsRenderRef.current = true;
  }, [
    state.canvas.offset.x,
    state.canvas.offset.y,
    state.canvas.zoom,
  ]);

  React.useEffect(() => {
    let animationFrame = 0;
    let disposed = false;
    let lastRenderAt = 0;

    const animate = (now: number): void => {
      if (disposed) return;
      const currentState = stateRef.current;
      const currentFrame = frameRef.current;
      const viewport = currentState.canvas.mode === "infinite" ? viewportRef.current : null;
      const interactionActive =
        now < viewportInteractionUntilRef.current;
      const shouldRender =
        (!interactionActive || viewport !== null) &&
        !renderPendingRef.current &&
        now >= controlSettleUntilRef.current &&
        now - lastRenderAt >= 1000 / 60 &&
        ((!interactionActive && currentState.timeline.isPlaying) || needsRenderRef.current);

      if (shouldRender && currentFrame.rect) {
        const canvas = canvasRef.current;
        if (canvas && glResource) {
          const frame = currentFrame.rect;
          const dpr = Math.max(1, window.devicePixelRatio || 1);
          const renderScale = getRenderScale(
            currentState.values["canvas.renderScale"],
          );
          const viewportScale = Math.max(
            0.01,
            currentState.canvas.zoom / 100,
          );
          const backingScale = dpr * renderScale * (viewport ? 1 : viewportScale);
          const outputSize = viewport ?? frame;
          const width = Math.max(1, Math.round(outputSize.width * backingScale));
          const height = Math.max(1, Math.round(outputSize.height * backingScale));

          canvas.style.width = `${outputSize.width}px`;
          canvas.style.height = `${outputSize.height}px`;

          const progress = interactionActive && lastProgressRef.current !== null
            ? lastProgressRef.current
            : getToolcraftTimelineLoopProgress(currentState.timeline);
          const settings = readDispersionSettings(currentState);
          const shouldYieldLensActivation =
            settings.lens.enabled &&
            !renderedLensEnabledRef.current &&
            !yieldedLensActivationRef.current;

          if (shouldYieldLensActivation) {
            // Let React's checked state reach the screen before submitting the
            // first expensive 35–50 tap Lens frame. The exact frame follows on
            // the next animation tick, including when playback is paused.
            yieldedLensActivationRef.current = true;
            needsRenderRef.current = true;
            lastRenderAt = now;
            animationFrame = requestAnimationFrame(animate);
            return;
          }

          const render = () => {
            glResource.render({
              height,
              includeBackground: shouldIncludeToolcraftPreviewBackground({
                state: currentState,
              }),
              previewOnBackground: currentState.canvas.mode === "infinite",
              viewWindow: viewport
                ? getDispersionViewWindow(viewport, currentState.canvas, backingScale)
                : undefined,
              internalScale: 1 / dpr,
              loopSeconds: currentState.timeline.durationSeconds,
              maskPreview: settings.masks.preview,
              opaqueOutside: false,
              progress,
              settings,
              width,
            });
            lastExactRenderAtRef.current = performance.now();
            lastProgressRef.current = progress;
            renderedLensEnabledRef.current = settings.lens.enabled;
            yieldedLensActivationRef.current = false;
            canvas.dataset.dispersionEngine = "webgl2";
            delete canvas.dataset.dispersionError;
            canvas.dataset.dispersionEffect = settings.effectMode;
            canvas.dataset.dispersionEffectArea = settings.effectArea;
            canvas.dataset.dispersionMode = settings.mode;
            canvas.dataset.dispersionProgress = progress.toFixed(6);
            canvas.dataset.dispersionShape = settings.shape;
            canvas.dataset.lensDistortion = settings.lens.enabled ? "on" : "off";
            canvas.dataset.lensCount = String(settings.lens.count);
            canvas.dataset.maskCount = String(settings.masks.items.length);
            canvas.dataset.maskEnabled = settings.masks.enabled ? "on" : "off";
            canvas.dataset.maskPreview = settings.masks.preview ? "on" : "off";
            canvas.dataset.renderScale = String(renderScale);
          };

          const renderedVersion = renderVersionRef.current;
          renderPendingRef.current = true;
          const result = pipeline
            ? pipeline.runPass(
                dispersionPipelinePasses.previewFrame,
                undefined,
                render,
              )
            : render();
          void Promise.resolve(result).finally(() => {
            renderPendingRef.current = false;
            if (!disposed && renderVersionRef.current === renderedVersion) {
              needsRenderRef.current = false;
            }
          });
          lastRenderAt = now;
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [glResource, pipeline]);

  const sceneRect = productSceneFrame.rect;
  const radius = sceneRect
    ? (Math.min(sceneRect.width, sceneRect.height) *
        previewSettings.cornerRadius) /
      100
    : 0;
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: previewBackgroundIncluded
      ? previewSettings.background
      : "transparent",
    borderRadius:
      state.canvas.mode === "finite" && previewSettings.shape === "rounded" ? `${radius}px` : 0,
    clipPath:
      state.canvas.mode === "finite" && previewSettings.shape === "circle" && sceneRect
        ? `circle(${Math.min(sceneRect.width, sceneRect.height) / 2}px at 50% 50%)`
        : undefined,
    height: sceneRect ? `${sceneRect.height}px` : "100%",
    width: sceneRect ? `${sceneRect.width}px` : "100%",
  };

  const output = (
    <canvas
      className={styles.canvas}
      data-dispersion-canvas="true"
      data-dispersion-engine={glResource ? "webgl2" : initializationFailed ? "unavailable" : "initializing"}
      data-dispersion-requested-shape={previewSettings.shape}
      data-lens-requested-count={previewSettings.lens.count}
      ref={attachCanvas}
    />
  );

  return (
    <div
      aria-label="Animated chromatic dispersion output"
      className={styles.surface}
      data-dispersion-surface="true"
      data-toolcraft-product-output="true"
      style={surfaceStyle}
    >
      {state.canvas.mode === "infinite"
        ? infiniteViewport && createPortal(output, infiniteViewport.element)
        : output}
    </div>
  );
}
