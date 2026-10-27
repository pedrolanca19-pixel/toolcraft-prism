import * as React from "react";

import styles from "./dispersion-renderer.module.css";

type Viewport = Readonly<{ element: HTMLDivElement; width: number; height: number }>;
let viewport: Viewport | null = null;
const listeners = new Set<() => void>();
const getSnapshot = () => viewport;
const getServerSnapshot = () => null;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

function publish(next: Viewport | null): void {
  if (viewport?.element === next?.element && viewport?.width === next?.width &&
      viewport?.height === next?.height) return;
  viewport = next;
  for (const listener of listeners) listener();
}

/** Ephemeral presentation mount only; runtime remains the state/bounds authority. */
export function useDispersionInfiniteViewport(): Viewport | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function DispersionInfiniteViewport(): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const element = ref.current!;
    const measure = () => publish({
      element, width: element.clientWidth, height: element.clientHeight,
    });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
      if (viewport?.element === element) publish(null);
    };
  }, []);
  return <div className={styles.infiniteSurface} data-dispersion-infinite-viewport=""
    data-toolcraft-product-output="true" ref={ref} />;
}
