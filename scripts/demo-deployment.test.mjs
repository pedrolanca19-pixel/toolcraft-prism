import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("uses the canonical Prism Flow identity", () => {
  assert.equal(JSON.parse(read("package.json")).name, "prism-flow");
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(lock.name, "prism-flow");
  assert.equal(lock.packages[""].name, "prism-flow");
  assert.match(read("index.html"), /toolcraft-app-title" content="Prism Flow"/);
  assert.match(read("index.html"), /<title>Prism Flow<\/title>/);
  assert.match(read("src/app/app-identity.ts"), /id: "prism-flow"/);
  assert.match(read("src/app/app-identity.ts"), /title: "Prism Flow"/);
  assert.match(read("src/app/app-schema.ts"), /fileName: "prism-flow-settings.json"/);
  assert.match(read("src/app/dispersion/dispersion-export.ts"), /baseFileName: "prism-flow"/);
});

test("serves the standard demo base and asset rewrites", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.equal(config.buildCommand, "npm run build -- --base /demos/prism-flow/");
  assert.deepEqual(config.rewrites, [
    { source: "/demos/prism-flow/assets/:path*", destination: "/assets/:path*" },
    { source: "/demos/prism-flow", destination: "/" },
    { source: "/demos/prism-flow/:path*", destination: "/" },
  ]);
  assert.match(read("src/router.tsx"), /basepath: routerBasePath/);
  assert.match(read("src/router.tsx"), /import\.meta\.env\.BASE_URL/);
});
