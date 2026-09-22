#!/usr/bin/env node
/**
 * Unit tests for IMP-038 SCA exception filtering (no live npm audit required).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REQUIRED_HEADERS,
  parseExceptionRegister,
  tokenizePackageCve,
  collectFindingKeys,
  findCoveringException,
  filterUncoveredPolicyFindings,
  activeExceptions,
  isActiveExpiry,
  isIsoDate,
} from "./audit-npm-sca.mjs";

const HEADER =
  "| id | package/cve | severity | owner | rationale | authority | compensating_controls | retest_date | expiry |\n" +
  "|---|---|---|---|---|---|---|---|---|";

test("isIsoDate accepts YYYY-MM-DD only", () => {
  assert.equal(isIsoDate("2026-09-23"), true);
  assert.equal(isIsoDate("2026-9-23"), false);
  assert.equal(isIsoDate("tomorrow"), false);
});

test("isActiveExpiry is inclusive of today", () => {
  assert.equal(isActiveExpiry("2026-09-23", "2026-09-23"), true);
  assert.equal(isActiveExpiry("2026-09-23", "2026-09-22"), false);
  assert.equal(isActiveExpiry("2026-09-23", "2026-10-01"), true);
});

test("parseExceptionRegister reads empty Active exceptions table", () => {
  const md = `# Vulnerability exception register\n\n## Active exceptions\n\n${HEADER}\n`;
  const { rows, errors } = parseExceptionRegister(md);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, []);
  assert.equal(REQUIRED_HEADERS.length, 9);
});

test("parseExceptionRegister validates headers and rows", () => {
  const md = `## Active exceptions\n\n${HEADER}\n| VEX-001 | lodash, GHSA-xxxx | high | alice | temp | FOUNDER | none | 2026-09-30 | 2026-10-01 |\n`;
  const { rows, errors } = parseExceptionRegister(md);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "VEX-001");
  assert.equal(rows[0]["package/cve"], "lodash, GHSA-xxxx");
});

test("expired exceptions are inactive", () => {
  const rows = [
    {
      id: "VEX-OLD",
      "package/cve": "lodash",
      severity: "high",
      owner: "a",
      rationale: "r",
      authority: "x",
      compensating_controls: "c",
      retest_date: "2026-01-01",
      expiry: "2026-01-02",
    },
  ];
  assert.equal(activeExceptions(rows, "2026-09-23").length, 0);
});

test("tokenizePackageCve splits commas and spaces", () => {
  assert.deepEqual(tokenizePackageCve("lodash, GHSA-r5fr-rjxr-66jc"), [
    "lodash",
    "ghsa-r5fr-rjxr-66jc",
  ]);
});

test("findCoveringException matches package or GHSA", () => {
  const active = [
    {
      id: "VEX-1",
      "package/cve": "GHSA-r5fr-rjxr-66jc",
      severity: "high",
      owner: "a",
      rationale: "r",
      authority: "x",
      compensating_controls: "c",
      retest_date: "2026-10-01",
      expiry: "2026-10-01",
    },
  ];
  const keys = collectFindingKeys("lodash", {
    severity: "high",
    via: [{ source: "GHSA-r5fr-rjxr-66jc", url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc" }],
  });
  assert.ok(findCoveringException(keys, active));
  assert.equal(
    findCoveringException(collectFindingKeys("other", { severity: "high", via: [] }), active),
    null,
  );
});

test("filterUncoveredPolicyFindings ignores moderate/low and covered highs", () => {
  const vulns = {
    leftpad: { severity: "moderate", via: [] },
    lodash: {
      severity: "high",
      range: "<=4.17.23",
      via: [{ url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc" }],
    },
    next: { severity: "critical", range: "<=16.3.2", via: ["GHSA-8h8q-6873-q5fj"] },
  };
  const active = [
    {
      id: "VEX-1",
      "package/cve": "lodash",
      severity: "high",
      owner: "a",
      rationale: "r",
      authority: "x",
      compensating_controls: "c",
      retest_date: "2026-10-01",
      expiry: "2026-10-01",
    },
  ];
  const uncovered = filterUncoveredPolicyFindings(vulns, active);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].packageName, "next");
  assert.equal(uncovered[0].severity, "critical");
});
