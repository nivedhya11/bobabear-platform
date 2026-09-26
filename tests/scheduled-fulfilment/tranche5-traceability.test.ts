/**
 * IMP-036I Tranche 5 traceability.
 *
 * Owner suites already execute under test:imp036i:tranche1–4. This test
 * fails if any story, acceptance scenario, business rule, or founder
 * decision disappears from that ownership or from the Tranche 5 command.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const plan = readFileSync("docs/platform/product/IMP-036I/implementation-plan.md", "utf8");
const product = readFileSync("docs/platform/product/IMP-036I/product-definition.md", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

function range(prefix: string, from: number, to: number, width: number): string[] {
  const ids: string[] = [];
  for (let n = from; n <= to; n += 1) ids.push(`${prefix}${String(n).padStart(width, "0")}`);
  return ids;
}

const stories = range("US-036I-", 1, 16, 3);
const scenarios = range("AC-036I-", 1, 66, 3);
const rules = range("BR-036I-", 1, 19, 3);
const decisions = range("FD-036I-", 1, 22, 2);

const trancheScripts = [
  "test:imp036i:tranche1",
  "test:imp036i:tranche2",
  "test:imp036i:tranche3",
  "test:imp036i:tranche4",
  "test:imp036i:tranche5",
] as const;

describe("IMP-036I tranche 5 traceability", () => {
  it("keeps every story, scenario, rule, and founder decision on an executing suite", () => {
    const ownership = plan.slice(
      plan.indexOf("PRIMARY_AC_OWNERSHIP_START"),
      plan.indexOf("PRIMARY_AC_OWNERSHIP_END"),
    );
    for (const id of scenarios) {
      expect(ownership, id).toContain(id);
    }
    for (const id of stories) expect(plan, id).toContain(id);
    for (const id of [...rules, ...decisions]) expect(product, id).toContain(id);
    const executed = trancheScripts.map((name) => pkg.scripts[name] ?? "").join("\n");
    expect(executed).toContain("tests/payment/payment.tranche5-hardening.integration.test.ts");
    expect(executed).toContain("tests/database/imp036i-scheduled-fulfilment.integration.test.ts");
    expect(executed).toContain("tests/payment/payment.scheduled-bind-race.domain.test.ts");
    expect(executed).toContain("tests/checkout/scheduled-surfaces.tranche3.test.ts");
    expect(executed).toContain("tests/order/scheduled-cancellation-reminder.tranche4.integration.test.ts");
    expect(executed).toContain(
      "tests/database/scheduled-financial-document-continuity.integration.test.ts",
    );
    expect(plan).toContain("FINANCIAL_DOCUMENT_NON_REGRESSION = OBJECTIVELY_PROVED");
    const proof = plan.slice(
      plan.indexOf("FINANCIAL_DOCUMENT_PROOF_START"),
      plan.indexOf("FINANCIAL_DOCUMENT_PROOF_END"),
    );
    expect(proof).toContain(
      "EXECUTABLE_PROOF = tests/database/scheduled-financial-document-continuity.integration.test.ts",
    );
    expect(proof).toContain("AC-036I-030 = EXECUTABLE_PROOF");
    expect(proof).toContain("AC-036I-050 = EXECUTABLE_PROOF");
    expect(proof).toContain(
      "AC-036I-056 = tests/administration/admin-brand-policy-http.tranche3.integration.test.ts",
    );
    expect(proof).toContain(
      "AC-036I-057 = tests/administration/admin-brand-policy-http.tranche3.integration.test.ts",
    );
    expect(proof).toContain(
      "AC-036I-058 = tests/administration/admin-brand-policy-http.tranche3.integration.test.ts",
    );
    expect(executed).toContain(
      "tests/administration/admin-brand-policy-http.tranche3.integration.test.ts",
    );
    expect(executed).toContain("src/components/ordering/CheckoutTimingChoice.test.tsx");
    expect(executed).toContain("tests/scheduled-fulfilment/windows.test.ts");
    for (const name of trancheScripts) {
      expect(pkg.scripts[name]?.length ?? 0).toBeGreaterThan(20);
    }
  });
});
