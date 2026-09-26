import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * Order and payment audits must track the sealed migration set by equality with
 * the drizzle SQL files, plus a historical floor. A closed allowlist of totals
 * (18/19/20, or any later fixed total) is not the invariant.
 */
test("order and payment migration audits match sealed count to SQL files", () => {
  const order = readFileSync(new URL("./audit-order.mjs", import.meta.url), "utf8");
  const payment = readFileSync(new URL("./audit-payment.mjs", import.meta.url), "utf8");
  for (const source of [order, payment]) {
    assert.match(source, /integrity\.migrations\.length !== drizzleFiles\.length/);
    assert.doesNotMatch(source, /18, 19, or 20/);
    assert.doesNotMatch(source, /16, 17, 18, 19, or 20/);
    assert.doesNotMatch(source, /found 47/);
  }
  assert.match(order, /below the order baseline of 18/);
  assert.match(payment, /below the payment baseline of 16/);

  for (const script of ["scripts/audit-order.mjs", "scripts/audit-payment.mjs"]) {
    const out = execFileSync(process.execPath, [script], { encoding: "utf8" });
    assert.match(out, /passed\n$/);
  }
});
