/**
 * IMP-027 architecture boundary audits (RF-21, RF-23, RF-25, IMP-028/029).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("IMP-027 architecture boundaries", () => {
  it("RF-21 does not add a customer refund HTTP endpoint", () => {
    const router = read("src/server/customer-commerce/http/router.ts");
    expect(router).not.toMatch(/refund/i);
    expect(router).not.toMatch(/\/api\/v1\/refunds/);
  });

  it("RF-25 does not add a new runtime service or broker", () => {
    const compose = read("compose.yaml");
    expect(compose).not.toMatch(/refund-worker|kafka|rabbitmq|refund-service/i);
    expect(compose).toContain("customer-commerce:");
  });

  it("does not steal IMP-028 document generation or Ops Console transport", () => {
    const files = readdirSync(path.join(root, "src/server/refund"));
    const blob = files.map((name) => read(`src/server/refund/${name}`)).join("\n");
    expect(blob).not.toMatch(/createInvoice|generateCreditNote|taxReceipt/);
    const schema = read("src/platform/database/schema/refund.ts");
    expect(schema).not.toMatch(/invoices|credit_notes|tax_receipts/);
  });

  it("RF-23 refund adapter does not log provider secrets", () => {
    const adapter = read("src/server/payment/provider/razorpay/refund.ts");
    expect(adapter).not.toMatch(/keySecret|webhookSecret|Authorization/);
    expect(adapter).toContain("X-Refund-Idempotency");
    expect(adapter).toContain("speed: \"normal\"");
  });
});
