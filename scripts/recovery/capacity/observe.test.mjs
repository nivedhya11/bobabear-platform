import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCapacityObservationReport } from "./observe.mjs";

test("capacity observation defaults STORAGE_CAPACITY_VALIDATED to NO", () => {
  const report = buildCapacityObservationReport({
    layer1BaseBytes: 1_000_000,
    layer1WalBytes: 200_000,
    layer2Bytes: 50_000,
    versionHistoryBytes: 10_000,
  });
  assert.equal(report.STORAGE_CAPACITY_VALIDATED, "NO");
  assert.equal(report.pricing, null);
  assert.ok(report.projected35DayFootprintBytes > 0);
});

test("capacity observation validates only when explicitly marked", () => {
  const report = buildCapacityObservationReport({
    layer1BaseBytes: 1,
    validated: true,
  });
  assert.equal(report.STORAGE_CAPACITY_VALIDATED, "YES");
});
