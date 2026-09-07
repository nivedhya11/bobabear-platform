import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyPersistenceImportLine,
  collectStaticDependencyStatements,
} from "./audit-persistence.mjs";

function classify(contents, relativePath = "src/platform/observability/health.ts", isClientModule = false) {
  const statements = collectStaticDependencyStatements(contents);
  assert.equal(statements.length, 1);
  return classifyPersistenceImportLine({
    relativePath,
    line: statements[0].text,
    isClientModule,
  });
}

test("collectStaticDependencyStatements preserves multiline declaration and start line", () => {
  const statements = collectStaticDependencyStatements(
    'const before = true;\nimport type {\n  Persistence,\n} from "../../server/persistence/types";\n',
  );

  assert.deepEqual(statements, [
    {
      text: 'import type {\n  Persistence,\n} from "../../server/persistence/types";',
      lineNo: 2,
    },
  ]);
});

test("multiline health exact Persistence type import remains allowed", () => {
  assert.equal(
    classify('import type {\n  Persistence,\n} from "../../server/persistence/types";'),
    null,
  );
});

test("multiline health other type import is rejected", () => {
  assert.equal(
    classify('import type {\n  PersistenceRole,\n} from "../../server/persistence/types";'),
    "OUTSIDE_ALLOWLIST",
  );
});

test("multiline health multiple type import is rejected", () => {
  assert.equal(
    classify(
      'import type {\n  Persistence,\n  PersistenceRole,\n} from "../../server/persistence/types";',
    ),
    "OUTSIDE_ALLOWLIST",
  );
});

test("multiline health aliased Persistence type import is rejected", () => {
  assert.equal(
    classify(
      'import type {\n  Persistence as HealthPersistence,\n} from "../../server/persistence/types";',
    ),
    "OUTSIDE_ALLOWLIST",
  );
});

test("multiline health runtime import is rejected", () => {
  assert.equal(
    classify(
      'import {\n  getApplicationPersistence,\n} from "../../server/persistence";',
    ),
    "OUTSIDE_ALLOWLIST",
  );
});

test("multiline health type re-export is rejected", () => {
  assert.equal(
    classify('export type {\n  Persistence,\n} from "../../server/persistence/types";'),
    "OUTSIDE_ALLOWLIST",
  );
});

test("multiline public app type import remains rejected before any exception", () => {
  assert.equal(
    classify(
      'import type {\n  Persistence,\n} from "@/server/persistence/types";',
      "src/app/order/page.tsx",
    ),
    "PUBLIC_APP_TREE",
  );
});

test("multiline public component re-export remains rejected", () => {
  assert.equal(
    classify(
      'export type {\n  Persistence,\n} from "@/server/persistence/types";',
      "src/components/CartBadge.tsx",
    ),
    "PUBLIC_APP_TREE",
  );
});

test("multiline client-module persistence import remains rejected", () => {
  assert.equal(
    classify(
      'import type {\n  Persistence,\n} from "@/server/persistence/types";',
      "src/lib/client-helper.ts",
      true,
    ),
    "CLIENT_MODULE",
  );
});
