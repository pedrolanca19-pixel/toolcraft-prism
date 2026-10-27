import type { Locator, Page } from "@playwright/test";

import { getDispersionAcceptanceId } from "../src/app/app-acceptance-data";
import { dispersionTargets } from "../src/app/dispersion/dispersion-values";
import { expectToolcraftCompoundControlPartOutcome } from "./browser-state-evidence-helpers";
import { expectToolcraftProductObservableToChange } from "./product-observable-helpers";
import type { ProofSession } from "./dispersion-browser-helpers";
import {
  canvasHash,
  canvasSelector,
  chooseOption,
} from "./dispersion-browser-helpers";
import { expect } from "./toolcraft-product-test";

async function setPadPoint(
  control: Locator,
  x: number,
  y: number,
): Promise<void> {
  const pad = control.locator('[data-vector-pad-variant="colorBalance"]');
  const box = await pad.boundingBox();
  expect(box).not.toBeNull();
  await pad.click({
    position: {
      x: ((x + 1) / 2) * box!.width,
      y: ((1 - y) / 2) * box!.height,
    },
  });
}

async function waitForCanvasChange(
  page: Page,
  previousHash: string,
): Promise<void> {
  await expect
    .poll(() => canvasHash(page), { timeout: 20_000 })
    .not.toBe(previousHash);
}

function observeChannelBias(session: ProofSession) {
  return session.observe((root) => {
    const source = root.querySelector(
      'canvas[data-dispersion-canvas="true"]',
    ) as HTMLCanvasElement | null;
    if (!source) return "missing";
    const sample = document.createElement("canvas");
    sample.width = 96;
    sample.height = 54;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return "missing";
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 8) continue;
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
      count += 1;
    }
    if (count === 0) return "missing";
    if (red > Math.max(green, blue) * 1.08) return "red";
    if ((red + green) / 2 > blue * 1.08) return "yellow";
    return "neutral";
  });
}

export async function proveColorBalancePad(
  page: Page,
  session: ProofSession,
): Promise<void> {
  const spectrum = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.spectrum}"]`,
  );
  const spectrumHash = await canvasHash(page);
  await chooseOption(page, spectrum, "Mono");
  await waitForCanvasChange(page, spectrumHash);

  const background = page.locator(
    `[data-toolcraft-control-target="${dispersionTargets.includeBackground}"]`,
  );
  const backgroundSwitch = background.getByRole("switch");
  if (await backgroundSwitch.isChecked()) {
    const backgroundHash = await canvasHash(page);
    await backgroundSwitch.click();
    await waitForCanvasChange(page, backgroundHash);
  }

  const target = dispersionTargets.colorBalance;
  const control = page.locator(
    `[data-toolcraft-control-target="${target}"]`,
  );
  await control.scrollIntoViewIfNeeded();
  await expect(
    control.locator('[data-vector-pad-variant="colorBalance"]'),
  ).toBeVisible();
  await setPadPoint(control, 0, 0);

  await expectToolcraftCompoundControlPartOutcome(
    observeChannelBias(session),
    session.controlAction(target, (currentControl) =>
      setPadPoint(currentControl, 0.85, 0),
    ),
    "red",
    {
      part: "vector.x",
      requirementId: getDispersionAcceptanceId(target),
      timeoutMs: 20_000,
    },
  );

  const redHash = await canvasHash(page);
  await setPadPoint(control, 0, 0);
  await waitForCanvasChange(page, redHash);

  await expectToolcraftCompoundControlPartOutcome(
    observeChannelBias(session),
    session.controlAction(target, (currentControl) =>
      setPadPoint(currentControl, 0, 0.85),
    ),
    "yellow",
    {
      part: "vector.y",
      requirementId: getDispersionAcceptanceId(target),
      timeoutMs: 20_000,
    },
  );

  await expectToolcraftProductObservableToChange(
    session,
    session.controlAction(target, (currentControl) =>
      setPadPoint(currentControl, 0, 0),
    ),
    {
      requirementId: getDispersionAcceptanceId(target),
      selector: canvasSelector,
      timeoutMs: 20_000,
    },
  );

  await expect(page.locator(canvasSelector)).toBeVisible();
}
