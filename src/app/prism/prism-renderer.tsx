import * as React from "react";

import { getToolcraftTimelineLoopProgress } from "@/toolcraft/runtime";
import {
  useToolcraft,
  useToolcraftProductSceneFrame,
} from "@/toolcraft/runtime/react";

import { createPrismGl, type PrismGl } from "./prism-gl";
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
  const sceneFrame = useToolcraftProductSceneFrame();
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const glRef = React.useRef<PrismGl | null>(null);
  const stateRef = React.useRef(state);
  const frameRef = React.useRef(sceneFrame);
  const dirtyRef = React.useRef(true);
  const settleUntilRef = React.useRef(0);

  stateRef.current = state;
  frameRef.current = sceneFrame;
  dirtyRef.current = true;

  React.useEffect(() => {
    settleUntilRef.current = performance.now() + VIEWPORT_SETTLE_MS;
  }, [state.canvas.offset.x, state.canvas.offset.y, state.canvas.zoom]);

  React.useEffect(() => {
    if (!canvas) return;
    let created: PrismGl;
    try {
      created = createPrismGl(canvas);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "WebGL2 initialization failed.");
      return;
    }
    glRef.current = created;
    setFailure(null);
    dirtyRef.current = true;
    let frameHandle = 0;
    let disposed = false;

    const tick = (now: number): void => {
      if (disposed) return;
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
        created.render({
          height: Math.max(2, Math.round(rect.height * backing)),
          includeBackdrop: settings.includeBackground,
          progress,
          settings,
          width: Math.max(2, Math.round(rect.width * backing)),
        });
        canvas.dataset.prismProgress = progress.toFixed(6);
        canvas.dataset.prismPalette = settings.palette;
        canvas.dataset.prismMask = settings.maskType;
        canvas.dataset.renderScale = String(renderScale);
        dirtyRef.current = false;
      }
      frameHandle = requestAnimationFrame(tick);
    };
    frameHandle = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameHandle);
      glRef.current = null;
      created.dispose();
    };
  }, [canvas]);

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
