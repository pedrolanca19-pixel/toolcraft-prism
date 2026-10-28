import { PRISM_ENTRIES, prismTarget } from "../src/app/prism/prism-table";
import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { appSchema } from "../src/app/app-schema";
import { expectToolcraftPersistenceState } from "./browser-state-evidence-helpers";
import { FIXTURE_SIZE, controlField, setTimelineDuration, openProof } from "./prism-browser-helpers";
import { expect, test } from "./toolcraft-product-test";

type PersistedWorkspace = {
  canvasStyleWidth: string | null;
  controlsCollapsed: boolean;
  controlsOffsetX: number | null;
  controlsOffsetY: number | null;
  persistedCanvasWidth: number | null;
  persistedCanvasZoom: number | null;
  persistedControlsCollapsed: boolean | null;
  persistedControlsOffsetX: number | null;
  persistedControlsOffsetY: number | null;
  persistedFoldFreq: number | null;
  persistedTimelineDuration: number | null;
  persistedValuesWidth: number | null;
  visibleZoom: string | null;
};

test(prismBrowserTestName("persistence.reload"), async ({ page }) => {
  const storageKey = appSchema.persistence.storage === "localStorage" ? appSchema.persistence.key : "";
  await page.addInitScript((key) => {
    Object.defineProperty(window, "__prismPersistenceKey", { configurable: false, value: key, writable: false });
  }, storageKey);
  const session = await openProof(page, ["runtime.setup", "folds"]);
  const changedWidth = FIXTURE_SIZE.width + 1;
  const changedZoom = 110;
  const changedOffset = { x: -48, y: 24 } as const;
  const changedDuration = 12;
  const foldFreqMax = PRISM_ENTRIES.foldFreq.max;

  const observeWorkspace = session.observe<PersistedWorkspace>((root) => {
    const canvas = root.querySelector<HTMLElement>("[data-toolcraft-editable-canvas]");
    const controlsHost = root.querySelector<HTMLElement>('[data-panel-type="controls"]');
    const toolbar = root.querySelector<HTMLElement>('[data-toolcraft-inspect-toolbar="true"]');
    const visibleZoom =
      [...(toolbar?.querySelectorAll("span") ?? [])]
        .map((candidate) => candidate.textContent?.trim() ?? "")
        .find((text) => /^\d+%$/u.test(text)) ?? null;
    const key = (window as Window & { __prismPersistenceKey?: unknown }).__prismPersistenceKey;
    const raw = typeof key === "string" ? localStorage.getItem(key) : null;
    const state = raw
      ? (JSON.parse(raw) as {
          state?: {
            canvas?: { size?: { width?: unknown }; zoom?: unknown };
            panels?: { controls?: { collapsed?: unknown; offset?: { x?: unknown; y?: unknown } } };
            timeline?: { durationSeconds?: unknown };
            values?: Record<string, unknown>;
          };
        }).state
      : undefined;
    const number = (value: unknown): number | null => (typeof value === "number" ? value : null);
    return {
      canvasStyleWidth: canvas?.style.width ?? null,
      controlsCollapsed: root.querySelector('[aria-label="Expand controls"]') !== null,
      controlsOffsetX: controlsHost ? Number(controlsHost.dataset.panelOffsetX) : null,
      controlsOffsetY: controlsHost ? Number(controlsHost.dataset.panelOffsetY) : null,
      persistedCanvasWidth: number(state?.canvas?.size?.width),
      persistedCanvasZoom: number(state?.canvas?.zoom),
      persistedControlsCollapsed:
        typeof state?.panels?.controls?.collapsed === "boolean" ? state.panels.controls.collapsed : null,
      persistedControlsOffsetX: number(state?.panels?.controls?.offset?.x),
      persistedControlsOffsetY: number(state?.panels?.controls?.offset?.y),
      persistedFoldFreq: number(state?.values?.["prism.foldFreq"]),
      persistedTimelineDuration: number(state?.timeline?.durationSeconds),
      persistedValuesWidth: number(state?.values?.["canvas.size.width"]),
      visibleZoom,
    };
  });

  await expectToolcraftPersistenceState(
    observeWorkspace,
    session.controlAction("canvas.size.width", async (control, currentPage) => {
      const input = control.locator("input");
      await expect(input).toHaveValue(String(FIXTURE_SIZE.width));
      await input.fill(String(changedWidth));
      await input.press("Enter");

      const foldFreq = controlField(currentPage, prismTarget("foldFreq")).getByRole("slider").first();
      await foldFreq.focus();
      await foldFreq.press("End");
      await expect(foldFreq).toHaveAttribute("aria-valuenow", String(foldFreqMax));

      await setTimelineDuration(currentPage, changedDuration);
      await currentPage.getByRole("button", { name: "Zoom in" }).click();

      const controlsHost = currentPage.locator('[data-panel-type="controls"]');
      const dragBox = await controlsHost.locator('[data-panel-drag-handle=""]').first().boundingBox();
      expect(dragBox).not.toBeNull();
      await currentPage.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2);
      await currentPage.mouse.down();
      await currentPage.mouse.move(
        dragBox!.x + dragBox!.width / 2 + changedOffset.x,
        dragBox!.y + dragBox!.height / 2 + changedOffset.y,
        { steps: 4 },
      );
      await currentPage.mouse.up();
      await expect(controlsHost).toHaveAttribute("data-panel-offset-x", String(changedOffset.x));
      await expect(controlsHost).toHaveAttribute("data-panel-offset-y", String(changedOffset.y));

      await currentPage.getByRole("button", { name: "Collapse controls" }).click();
      await expect(currentPage.getByRole("button", { name: "Expand controls" })).toBeVisible();
      await expect(currentPage.locator('[data-slot="toolcraft-runtime-app"]')).toHaveAttribute(
        "data-toolcraft-persistence-status",
        "success",
      );
    }),
    session.reload(),
    {
      canvasStyleWidth: `${changedWidth}px`,
      controlsCollapsed: true,
      controlsOffsetX: changedOffset.x,
      controlsOffsetY: changedOffset.y,
      persistedCanvasWidth: changedWidth,
      persistedCanvasZoom: changedZoom,
      persistedControlsCollapsed: true,
      persistedControlsOffsetX: changedOffset.x,
      persistedControlsOffsetY: changedOffset.y,
      persistedFoldFreq: foldFreqMax,
      persistedTimelineDuration: changedDuration,
      persistedValuesWidth: changedWidth,
      visibleZoom: `${changedZoom}%`,
    },
    { requirementId: "persistence.reload", stabilityIntervalMs: 0 },
  );
});
