import type { Locator, Page } from "@playwright/test";
import { PRISM_PRESET_NAMES } from "../src/app/prism/prism-presets";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget, type PrismKey } from "../src/app/prism/prism-table";
import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { PRISM_MASK_IMAGE_TARGET } from "../src/app/prism/prism-mask-source";
import { readToolcraftBrowserObservation } from "./browser-proof-session";
import { expectToolcraftMediaLifecycle } from "./browser-state-evidence-helpers";
import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import { applicabilityCases, canvasHash, controlField, exportImage, openProof, prismValuesSnapshot, type ProofSession, proveApplicabilityCase, proveColorChange, proveSelectChange, proveSliderChange, proveSwitchChange } from "./prism-browser-helpers";
import { inspectImage, meanDistanceToPreview } from "./prism-export-helpers";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { expect, test } from "./toolcraft-product-test";

/**
 * Values a control's proof starts from when the shipped default would hide the
 * control's effect. Everything else starts from the shipped defaults.
 */
const PROOF_START: Partial<Record<PrismKey, Readonly<Record<string, unknown>>>> = {
  bloomTint: { [prismTarget("bloomTintAmt")]: 0.8 },
  bloomTintAmt: { [prismTarget("bloomTint")]: "#FF3366" },
  edgeSoft: { [prismTarget("coverage")]: 0.5 },
};

const CONDITIONAL_KEYS: ReadonlySet<PrismKey> = new Set([
  "c0", "c1", "c2", "c3",
  "maskType", "maskAngle", "maskX", "maskY", "maskSize", "maskSoft", "maskWarp", "maskInvert",
  "ribCount", "ribWidth", "ribIrregular", "ribAngle", "ribLens", "ribShift", "ribEdge", "ribEdgeWidth",
]);

const COLOR_PROOF: Readonly<Record<string, string>> = {
  bg2: "#33CC99", bloomTint: "#33CC99", c0: "#33CC99", c1: "#CC3366", c2: "#3366CC", c3: "#CCCC33",
};

for (const key of PRISM_KEYS) {
  const entry = PRISM_ENTRIES[key];
  const target = prismTarget(key);
  test(prismBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page, [entry.section], PROOF_START[key]);
    const prove = async (requirementId: string): Promise<void> => {
      switch (entry.kind) {
        case "slider":
        case "int":
          await proveSliderChange(session, target, requirementId);
          return;
        case "bool":
          await proveSwitchChange(session, target, requirementId);
          return;
        case "color":
          await proveColorChange(session, target, COLOR_PROOF[key] ?? "#33CC99", requirementId);
          return;
        case "select":
          for (const option of entry.options) {
            if (option.value === entry.def) continue;
            await proveSelectChange(session, target, option.label, requirementId);
          }
          return;
      }
    };
    if (CONDITIONAL_KEYS.has(key)) {
      for (const applicabilityCase of applicabilityCases(target)) {
        const requirementId = await proveApplicabilityCase(session, target, applicabilityCase);
        if (applicabilityCase.expectation === "visible") await prove(requirementId);
      }
      return;
    }
    if (entry.kind === "int" && (entry.max - entry.min) / entry.step + 1 <= 32) {
      await expectToolcraftDiscreteSliderMarkers(page, target);
    }
    await prove(target);
  });
}

const SECTION_IDS = [
  "motion", "folds", "surface", "lighting", "highlights", "spectrum", "refraction", "glow",
  "placement", "ribs", "mask", "backdrop", "finish",
] as const;

type ActionClick = (control: Locator, page: Page) => Promise<void>;

async function expectActionToChangeOutput(
  session: ProofSession,
  page: Page,
  target: string,
  label: string | ActionClick,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftAcceptanceOutcome(
    async () => `${await prismValuesSnapshot(page)}|${await canvasHash(page)}`,
    session.controlAction(target, async (control, currentPage) => {
      if (typeof label === "function") await label(control, currentPage);
      else await control.getByRole("button", { name: label, exact: true }).click();
    }),
    // Two settled samples are enough: the persisted values are exact, and this keeps the preset proof inside 30 s.
    { evidenceType: "command-side-effect", requirementId, stabilityIntervalMs: 30, stabilitySamples: 2, timeoutMs: 15_000 },
  );
}

test(prismBrowserTestName("prism.presets"), async ({ page }) => {
  const session = await openProof(page, ["presets"]);
  // Nine presets are too many for inline buttons, so the control is a chooser with Previous and Next.
  const choose = (name: string): ActionClick => async (control, currentPage) => {
    await control.getByRole("button", { name: "Choose presets action", exact: true }).click();
    await currentPage.getByRole("menuitem", { name, exact: true }).click();
  };
  const next: ActionClick = (control) => control.getByRole("button", { name: "Next presets action", exact: true }).click();
  // The first preset matches the shipped defaults, so it goes last to keep every click a change.
  const [first, second, ...rest] = PRISM_PRESET_NAMES;
  await expectActionToChangeOutput(session, page, "prism.presets", choose(second!));
  for (let index = 0; index < rest.length; index += 1) {
    await expectActionToChangeOutput(session, page, "prism.presets", next);
  }
  await expectActionToChangeOutput(session, page, "prism.presets", choose(first!));
});

test(prismBrowserTestName("prism.randomize"), async ({ page }) => {
  const session = await openProof(page, ["presets"]);
  await expectActionToChangeOutput(session, page, "prism.randomize", "Randomize all");
  await expectActionToChangeOutput(session, page, "prism.randomize", "Colors only");
});

test(prismBrowserTestName("prism.palette.edit"), async ({ page }) => {
  const session = await openProof(page, ["spectrum"]);
  const target = "prism.palette.edit";
  for (const applicabilityCase of applicabilityCases(target)) {
    const requirementId = await proveApplicabilityCase(session, target, applicabilityCase);
    if (applicabilityCase.expectation === "visible") {
      await expectActionToChangeOutput(session, page, target, "Edit as custom", requirementId);
    }
  }
});

for (const section of SECTION_IDS) {
  const target = `prism.shuffle-${section}`;
  test(prismBrowserTestName(target), async ({ page }) => {
    const session = await openProof(page, [section]);
    await expectActionToChangeOutput(session, page, target, "Randomize");
  });
}

const MASK_FILE = "e2e/fixtures/prism-mask-test.png";
const MASK_FILE_NAME = "prism-mask-test.png";

test(prismBrowserTestName(PRISM_MASK_IMAGE_TARGET), async ({ page }) => {
  const session = await openProof(page, ["mask"], {
    [prismTarget("maskSize")]: 1,
    [prismTarget("maskSoft")]: 0.3,
    [prismTarget("maskType")]: "image",
  });
  const field = controlField(page, PRISM_MASK_IMAGE_TARGET);
  const observe = session.observe((root) => {
    const owner = root.querySelector(`[data-toolcraft-control-target="prism.maskImage"]`);
    const itemIds = [...(owner?.querySelectorAll("button[aria-label^='Remove ']") ?? [])].map(
      (button) => (button.getAttribute("aria-label") ?? "").replace(/^Remove /u, ""),
    );
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-prism-canvas="true"]');
    const sample = document.createElement("canvas");
    sample.width = 80;
    sample.height = 45;
    const context = sample.getContext("2d", { willReadFrequently: true });
    let hash = 2166136261;
    if (canvas && context) {
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      for (const byte of context.getImageData(0, 0, sample.width, sample.height).data) {
        hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      }
    }
    return { itemIds, outputSignature: hash.toString(16) };
  });
  const read = () => readToolcraftBrowserObservation(observe);
  // Software GL decodes and renders slowly, so uploads get a generous window.
  const items = (expected: readonly string[]) =>
    expect.poll(async () => (await read()).itemIds, { timeout: 30_000 }).toEqual(expected);
  const settled = async (): Promise<string> => {
    // The signature is final once two reads half a second apart agree.
    let previous = (await read()).outputSignature;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await page.waitForTimeout(500);
      const next = (await read()).outputSignature;
      if (next === previous) return next;
      previous = next;
    }
    return previous;
  };
  const upload = (): Promise<void> => field.locator('input[type="file"]').setInputFiles(MASK_FILE);
  const press = (name: string): Promise<void> => field.getByRole("button", { exact: true, name }).click();

  // The upload is visible only while the mask is on and its shape is Image.
  for (const applicabilityCase of applicabilityCases(PRISM_MASK_IMAGE_TARGET)) {
    await proveApplicabilityCase(session, PRISM_MASK_IMAGE_TARGET, applicabilityCase);
  }

  // Behaviors: upload, rotate, flip and remove each change what the light is confined to.
  const empty = await settled();
  await upload();
  await items([MASK_FILE_NAME]);
  const uploaded = await settled();
  expect(uploaded).not.toBe(empty);
  // The export renderer reads the same decoded mask, so the exported frame matches the preview.
  const exported = await inspectImage(page, await exportImage(page));
  expect(await meanDistanceToPreview(page, exported.observation)).toBeLessThan(16);
  await press("90° Right");
  const rotated = await settled();
  expect(rotated).not.toBe(uploaded);
  await press("Flip horizontal");
  const flippedH = await settled();
  expect(flippedH).not.toBe(rotated);
  await press("Flip vertical");
  const flippedV = await settled();
  expect(flippedV).not.toBe(flippedH);
  await press(`Remove ${MASK_FILE_NAME}`);
  await items([]);
  expect(await settled()).toBe(empty);

  const [uploadRequirement, removeRequirement] = [
    `${PRISM_MASK_IMAGE_TARGET}#applicability:prism.maskEnabled=true:visible`,
    `${PRISM_MASK_IMAGE_TARGET}#applicability:prism.maskType=%22image%22:visible`,
  ];
  await expectToolcraftMediaLifecycle(
    observe,
    session.controlAction(PRISM_MASK_IMAGE_TARGET, () => upload()),
    { itemIds: [MASK_FILE_NAME], outputSignature: uploaded },
    { requirementId: uploadRequirement, stabilityIntervalMs: 400, timeoutMs: 40_000 },
  );
  await expectToolcraftMediaLifecycle(
    observe,
    session.controlAction(PRISM_MASK_IMAGE_TARGET, () => press(`Remove ${MASK_FILE_NAME}`)),
    { itemIds: [], outputSignature: empty },
    { requirementId: removeRequirement, stabilityIntervalMs: 400, timeoutMs: 40_000 },
  );

  // Reset controls clears the uploaded mask along with every other setting.
  await upload();
  await items([MASK_FILE_NAME]);
  await page.getByRole("button", { exact: true, name: "Reset controls" }).click();
  await items([]);
});
