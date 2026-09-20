import assert from "node:assert/strict";
import { test } from "node:test";
import { PROOF_CODE } from "../constants.mjs";
import { runBusinessIntegrityValidation } from "./business-integrity.mjs";

test("business integrity distinguishes DB_REACHABLE from BUSINESS_INTEGRITY_VALIDATED", async () => {
  const tables = new Set([
    "customer_auth_users",
    "customer_auth_sessions",
    "workforce_auth_users",
    "workforce_auth_sessions",
    "access_permissions",
    "access_roles",
    "access_memberships",
    "organizations",
    "outlets",
    "brands",
    "customer_profiles",
    "carts",
    "cart_lines",
    "checkouts",
    "checkout_snapshots",
    "orders",
    "payments",
    "payment_attempts",
    "refunds",
    "outbox_events",
    "idempotency_records",
    "financial_documents",
    "financial_document_lines",
    "financial_document_signed_artifact_objects",
    "signature_artifacts",
    "deliveries",
    "delivery_assignments",
  ]);

  const result = await runBusinessIntegrityValidation({
    async queryFn(sql, params) {
      if (sql === "SELECT 1") return [{ ok: 1 }];
      if (sql.includes("information_schema.tables")) {
        const table = params?.[1];
        return tables.has(table) ? [{ ok: 1 }] : [];
      }
      if (sql.includes("COUNT(*)")) return [{ count: 0 }];
      return [];
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.results.some((entry) => entry.code === PROOF_CODE.DB_REACHABLE && entry.ok), true);
  assert.equal(
    result.results.some((entry) => entry.code === PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED && entry.ok),
    true,
  );
});

test("unreachable DB fails before business validation code succeeds", async () => {
  const result = await runBusinessIntegrityValidation({
    async queryFn() {
      throw new Error("connection refused");
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.results[0].code, PROOF_CODE.DB_REACHABLE);
  assert.equal(result.results[0].ok, false);
  assert.equal(result.results.some((entry) => entry.code === PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED), false);
});
