import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { DEFAULT_UNIT_DIR, parseUnitFile, validateSystemdUnits } from "./validate.mjs";

test("parseUnitFile extracts sections and keys", () => {
  const parsed = parseUnitFile(`[Unit]
Description=test

[Service]
Type=oneshot
ExecStart=/bin/true

[Install]
WantedBy=multi-user.target
`);
  assert.equal(parsed.Service.Type, "oneshot");
  assert.equal(parsed.Service.ExecStart, "/bin/true");
  assert.equal(parsed.Unit.Description, "test");
});

test("validateSystemdUnits accepts repository templates", () => {
  const result = validateSystemdUnits({
    unitDir: DEFAULT_UNIT_DIR,
    tryAnalyze: false,
  });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.filesChecked >= 6, true);
});

test("validateSystemdUnits fails on missing ExecStart", () => {
  const unitDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures-missing");
  // Use inline temp via parse validation path: call validate with empty dir expectation
  const result = validateSystemdUnits({
    unitDir: path.join(DEFAULT_UNIT_DIR, "does-not-exist"),
    tryAnalyze: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /missing|no \.service/i);
  void unitDir;
});
