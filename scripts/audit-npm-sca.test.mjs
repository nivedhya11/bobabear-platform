#!/usr/bin/env node
/**
 * Unit tests for IMP-038 SCA exception filtering (no live npm audit required).
 *
 * Invariant: every High/Critical advisory must itself be covered by an ACTIVE
 * exception. One matched GHSA/CVE must never implicitly cover another advisory.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REQUIRED_HEADERS,
  parseExceptionRegister,
  tokenizePackageCve,
  collectFindingKeys,
  collectAdvisoryIdentityKeys,
  extractPolicyAdvisories,
  findCoveringException,
  findCoveringExceptionForAdvisory,
  filterUncoveredPolicyFindings,
  activeExceptions,
  isActiveExpiry,
  isIsoDate,
} from "./audit-npm-sca.mjs";

const HEADER =
  "| id | package/cve | severity | owner | rationale | authority | compensating_controls | retest_date | expiry |\n" +
  "|---|---|---|---|---|---|---|---|---|";

function exceptionRow(overrides) {
  return {
    id: "VEX-1",
    "package/cve": "lodash",
    severity: "high",
    owner: "a",
    rationale: "r",
    authority: "x",
    compensating_controls: "c",
    retest_date: "2026-10-01",
    expiry: "2026-10-01",
    ...overrides,
  };
}

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
  const rows = [exceptionRow({ id: "VEX-OLD", expiry: "2026-01-02", retest_date: "2026-01-01" })];
  assert.equal(activeExceptions(rows, "2026-09-23").length, 0);
});

test("tokenizePackageCve splits commas and spaces", () => {
  assert.deepEqual(tokenizePackageCve("lodash, GHSA-r5fr-rjxr-66jc"), [
    "lodash",
    "ghsa-r5fr-rjxr-66jc",
  ]);
});

test("findCoveringException matches package or GHSA (legacy aggregate)", () => {
  const active = [exceptionRow({ "package/cve": "GHSA-r5fr-rjxr-66jc" })];
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

test("package with one High advisory and no exception → FAIL", () => {
  const vulns = {
    lodash: {
      severity: "high",
      range: "<=4.17.23",
      via: [
        {
          source: 1100001,
          name: "lodash",
          severity: "high",
          url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc",
        },
      ],
    },
  };
  const uncovered = filterUncoveredPolicyFindings(vulns, []);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].packageName, "lodash");
  assert.equal(uncovered[0].severity, "high");
});

test("matching explicit GHSA exception → PASS", () => {
  const vulns = {
    lodash: {
      severity: "high",
      via: [
        {
          severity: "high",
          url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc",
        },
      ],
    },
  };
  const active = [exceptionRow({ "package/cve": "GHSA-r5fr-rjxr-66jc" })];
  assert.deepEqual(filterUncoveredPolicyFindings(vulns, active), []);
});

test("multiple policy advisories where only one is excepted → FAIL", () => {
  const vulns = {
    lodash: {
      severity: "critical",
      via: [
        {
          severity: "high",
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
        },
        {
          severity: "critical",
          url: "https://github.com/advisories/GHSA-dddd-eeee-ffff",
        },
      ],
    },
  };
  const active = [exceptionRow({ "package/cve": "GHSA-aaaa-bbbb-cccc" })];
  const uncovered = filterUncoveredPolicyFindings(vulns, active);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].severity, "critical");
  assert.ok(uncovered[0].keys.includes("ghsa-dddd-eeee-ffff"));
  assert.ok(!uncovered[0].keys.includes("ghsa-aaaa-bbbb-cccc"));
});

test("all policy-level advisories individually covered → PASS", () => {
  const vulns = {
    lodash: {
      severity: "critical",
      via: [
        {
          severity: "high",
          url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
        },
        {
          severity: "critical",
          url: "https://github.com/advisories/GHSA-dddd-eeee-ffff",
        },
      ],
    },
  };
  const active = [
    exceptionRow({ id: "VEX-A", "package/cve": "GHSA-aaaa-bbbb-cccc" }),
    exceptionRow({ id: "VEX-B", "package/cve": "GHSA-dddd-eeee-ffff", severity: "critical" }),
  ];
  assert.deepEqual(filterUncoveredPolicyFindings(vulns, active), []);
});

test("expired exception → FAIL", () => {
  const vulns = {
    lodash: {
      severity: "high",
      via: [{ severity: "high", url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc" }],
    },
  };
  const rows = [
    exceptionRow({
      "package/cve": "GHSA-r5fr-rjxr-66jc",
      expiry: "2026-01-01",
      retest_date: "2025-12-01",
    }),
  ];
  const active = activeExceptions(rows, "2026-09-23");
  assert.equal(active.length, 0);
  assert.equal(filterUncoveredPolicyFindings(vulns, active).length, 1);
});

test("package-name exception covers that package only (register contract)", () => {
  const vulns = {
    lodash: {
      severity: "high",
      via: [
        { severity: "high", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" },
        { severity: "high", url: "https://github.com/advisories/GHSA-dddd-eeee-ffff" },
      ],
    },
    next: {
      severity: "critical",
      via: [{ severity: "critical", url: "https://github.com/advisories/GHSA-8h8q-6873-q5fj" }],
    },
  };
  const active = [exceptionRow({ "package/cve": "lodash" })];
  const uncovered = filterUncoveredPolicyFindings(vulns, active);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].packageName, "next");
});

test("package-name-only exception cannot suppress unrelated advisory identities on other packages", () => {
  const active = [exceptionRow({ "package/cve": "lodash" })];
  const nextAdvisory = extractPolicyAdvisories("next", {
    severity: "critical",
    via: [{ severity: "critical", url: "https://github.com/advisories/GHSA-8h8q-6873-q5fj" }],
  })[0];
  assert.equal(findCoveringExceptionForAdvisory(nextAdvisory, active), null);
});

test("filterUncoveredPolicyFindings ignores moderate/low", () => {
  const vulns = {
    leftpad: { severity: "moderate", via: [{ severity: "moderate", url: "https://github.com/advisories/GHSA-zzzz" }] },
    next: { severity: "critical", range: "<=16.3.2", via: [{ severity: "critical", url: "https://github.com/advisories/GHSA-8h8q-6873-q5fj" }] },
  };
  const uncovered = filterUncoveredPolicyFindings(vulns, []);
  assert.equal(uncovered.length, 1);
  assert.equal(uncovered[0].packageName, "next");
});

test("collectAdvisoryIdentityKeys extracts GHSA from url without package name", () => {
  const keys = collectAdvisoryIdentityKeys({
    url: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc",
    severity: "high",
  });
  assert.ok(keys.has("ghsa-r5fr-rjxr-66jc"));
  assert.ok(!keys.has("lodash"));
});
