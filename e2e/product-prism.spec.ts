import type { Page } from "@playwright/test";
import { PRISM_PRESET_NAMES } from "../src/app/prism/prism-presets";
import { PRISM_ENTRIES, PRISM_KEYS, prismTarget, type PrismKey } from "../src/app/prism/prism-table";
import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { expectToolcraftAcceptanceOutcome } from "./browser-acceptance-outcome-helpers";
import { applicabilityCases, canvasHash, openProof, prismValuesSnapshot, type ProofSession, proveApplicabilityCase, proveColorChange, proveSelectChange, proveSliderChange, proveSwitchChange } from "./prism-browser-helpers";
import { expectToolcraftDiscreteSliderMarkers } from "./performance-control-layout-helpers";
import { test } from "./toolcraft-product-test";

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
  "placement", "mask", "backdrop", "finish",
] as const;

async function expectActionToChangeOutput(
  session: ProofSession,
  page: Page,
  target: string,
  label: string,
  requirementId: string = target,
): Promise<void> {
  await expectToolcraftAcceptanceOutcome(
    async () => `${await prismValuesSnapshot(page)}|${await canvasHash(page)}`,
    session.controlAction(target, (control) =>
      control.getByRole("button", { name: label, exact: true }).click(),
    ),
    { evidenceType: "command-side-effect", requirementId, stabilityIntervalMs: 80, timeoutMs: 15_000 },
  );
}

test(prismBrowserTestName("prism.presets"), async ({ page }) => {
  const session = await openProof(page, ["presets"]);
  // The first preset matches the shipped defaults, so it goes last to keep every click a change.
  for (const name of [...PRISM_PRESET_NAMES.slice(1), ...PRISM_PRESET_NAMES.slice(0, 1)]) {
    await expectActionToChangeOutput(session, page, "prism.presets", name);
  }
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
