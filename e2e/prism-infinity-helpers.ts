import { expect, type Page } from "@playwright/test";

import { controlField } from "./prism-browser-helpers";

export async function waitForCanvasMode(page: Page, mode: "finite" | "infinite"): Promise<void> {
  await expect(page.locator("[data-toolcraft-canvas-mode]")).toHaveAttribute("data-toolcraft-canvas-mode", mode);
  // Let the product scene finish re-measuring before it is observed.
  await expect(page.locator("[data-toolcraft-product-scene]")).toHaveAttribute("data-toolcraft-product-scene-status", "ready");
  await page.waitForTimeout(250);
}

export async function setInfinity(page: Page, on: boolean): Promise<void> {
  const toggle = controlField(page, "canvas.infinity").getByRole("switch");
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click();
  await waitForCanvasMode(page, on ? "infinite" : "finite");
}

export async function undo(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Undo", exact: true }).click();
}

export async function redo(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Redo", exact: true }).click();
}

export type ProductIdentity = Awaited<ReturnType<typeof captureIdentity>>;

export async function captureIdentity(page: Page) {
  return page.evaluateHandle(() => ({
    host: document.querySelector("[data-toolcraft-product-scene]"),
    output: document.querySelector("[data-toolcraft-product-scene] canvas"),
  }));
}

export async function compareIdentity(page: Page, identity: ProductIdentity) {
  return page.evaluate(
    (baseline) => ({
      productHostPreserved:
        baseline.host !== null && baseline.host === document.querySelector("[data-toolcraft-product-scene]"),
      productOutputPreserved:
        baseline.output !== null && baseline.output === document.querySelector("[data-toolcraft-product-scene] canvas"),
    }),
    identity,
  );
}
