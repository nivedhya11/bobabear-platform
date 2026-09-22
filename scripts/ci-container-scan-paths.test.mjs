import assert from "node:assert/strict";
import { test } from "node:test";

import { isContainerScanPath } from "./ci-container-scan-paths.mjs";

test("isContainerScanPath matches Dockerfile and docker/ tree", () => {
  assert.equal(isContainerScanPath("Dockerfile"), true);
  assert.equal(isContainerScanPath("docker/nginx/default.conf"), true);
  assert.equal(isContainerScanPath(".dockerignore"), true);
  assert.equal(isContainerScanPath(".trivyignore"), true);
  assert.equal(isContainerScanPath("scripts/run-trivy.mjs"), true);
  assert.equal(isContainerScanPath("compose.yml"), true);
  assert.equal(isContainerScanPath("docker-compose.yml"), true);
  assert.equal(isContainerScanPath("src/app/page.tsx"), false);
  assert.equal(isContainerScanPath("docs/platform/security/README.md"), false);
});
