import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));

/** Canonical Docker tooling wrappers that accept `--apply` via npm forwarding. */
const APPLY_FORWARDING_SCRIPTS = Object.freeze([
  {
    name: "docker:menu:import-existing",
    composeService: "menu-import-existing",
    innerScript: "menu:import-existing",
    importerProgram: "scripts/menu/import-existing.ts",
  },
  {
    name: "docker:pricing:bootstrap-existing-menu",
    composeService: "pricing-bootstrap-existing-menu",
    innerScript: "pricing:bootstrap-existing-menu",
    importerProgram: "scripts/pricing/bootstrap-existing-menu.ts",
  },
  {
    name: "docker:assortment:bootstrap-existing-menu",
    composeService: "assortment-bootstrap-existing-menu",
    innerScript: "assortment:bootstrap-existing-menu",
    importerProgram: "scripts/assortment/bootstrap-existing-menu.ts",
  },
  {
    name: "docker:catalog:bootstrap-imp028c-modifiers",
    composeService: "catalog-bootstrap-imp028c-modifiers",
    innerScript: "catalog:bootstrap-imp028c-modifiers",
    importerProgram: "scripts/catalog/bootstrap-imp028c-modifiers.ts",
  },
]);

test("Docker apply-forwarding wrappers clear entrypoint and terminate with npm --", () => {
  for (const { name, composeService, innerScript, importerProgram } of APPLY_FORWARDING_SCRIPTS) {
    const script = packageJson.scripts[name];
    assert.ok(script, `${name} must exist in package.json scripts`);
    assert.match(script, /--entrypoint\s+""/, `${name} must clear the Node image entrypoint`);
    assert.match(
      script,
      new RegExp(`docker compose run --rm --entrypoint "" ${composeService} npm run ${innerScript.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} --$`),
      `${name} must forward CLI args to the inner npm script`,
    );
    assert.doesNotMatch(
      script,
      new RegExp(`^docker compose run --rm ${composeService}$`),
      `${name} must not pass appended args directly to docker compose (would become node --apply)`,
    );

    const inner = packageJson.scripts[innerScript];
    assert.ok(inner, `${innerScript} must exist`);
    assert.match(inner, new RegExp(importerProgram.replace(/\./g, "\\.")));
    assert.doesNotMatch(inner, /^node --apply$/, `${innerScript} must invoke the importer program, not node --apply`);
  }
});

test("menu import inner script targets the existing-menu importer program", () => {
  const inner = packageJson.scripts["menu:import-existing"];
  assert.match(inner, /scripts\/menu\/import-existing\.ts$/);
  assert.doesNotMatch(inner, /^node --apply$/);
});

test("tooling image packages IMP-028C modifier bootstrap script, artifact, and menu-manifest closure", () => {
  const dockerfile = readFileSync(path.join(projectRoot, "Dockerfile"), "utf8");
  const toolingStage = dockerfile.split("FROM base AS tooling")[1]?.split(/^FROM /m)[0] ?? "";
  assert.ok(toolingStage.length > 0, "Dockerfile must declare a tooling stage");
  assert.match(toolingStage, /^COPY scripts\/catalog \.\/scripts\/catalog$/m);
  assert.match(toolingStage, /^COPY data\/platform\/catalog \.\/data\/platform\/catalog$/m);
  assert.match(toolingStage, /^COPY data\/platform\/imports \.\/data\/platform\/imports$/m);
  assert.match(toolingStage, /^COPY src \.\/src$/m);

  const compose = readFileSync(path.join(projectRoot, "compose.yaml"), "utf8");
  assert.match(compose, /^  catalog-bootstrap-imp028c-modifiers:$/m);
  assert.match(compose, /target: tooling/);
});
