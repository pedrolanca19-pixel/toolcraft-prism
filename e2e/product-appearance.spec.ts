import { prismBrowserTestName } from "../src/app/prism/prism-acceptance";
import { openProof, proveColorChange } from "./prism-browser-helpers";
import { test } from "./toolcraft-product-test";

test(prismBrowserTestName("appearance.background"), async ({ page }) => {
  const session = await openProof(page, ["runtime.setup"]);
  await proveColorChange(session, "appearance.background", "#33CC99");
});
