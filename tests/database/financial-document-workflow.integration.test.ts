/**
 * IMP-028 Slice 8 — Payment SUCCEEDED → RECEIPT_VOUCHER workflow (FD-WP01..WP33).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";

import {
  generateCustomerFinancialDocumentArtifact,
  issueReceiptVoucherForSucceededPayment,
  listFinancialDocumentsForCustomerOrder,
  loadFinancialDocument,
  recoverMissingReceiptVouchersBatch,
  receiptVoucherLogicalIssuanceKey,
  findFinancialDocumentByLogicalIssuanceKey,
  runRecoverMissingReceiptVouchersOperator,
} from "../../src/server/financial-document";
import { signFinancialDocumentWithRenderedPdf } from "./support/manual-signed-upload-fixtures";
import { executeRecoverMissingReceiptVouchersCli } from "../../scripts/financial-document/recover-missing-receipt-vouchers";
import {
  completeZeroPayableCheckout,
  getPayment,
  reconcilePaymentAttempt,
  startPayment,
  submitPaymentClientEvidence,
} from "../../src/server/payment";
import { findOrderByCheckoutId } from "../../src/server/order/repository";
import {
  deriveIndianFinancialYear,
  FinancialDocumentError,
} from "../../src/shared/financial-document";
import { RAZORPAY_STANDARD_CHECKOUT_KIND } from "../../src/shared/payment";
import {
  applyCouponToCustomerCart,
  bringCheckoutToReady,
  closeTrackedPersistenceHandles,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  seedFullDiscountCoupon,
  verifyAndProcessWebhook,
  withCheckoutReadyHarness,
  withPaymentReadyHarness,
} from "./support/payment-fixtures";
import {
  seedReceiptVoucherWorkflowConfig,
  WORKFLOW_FINANCIAL_YEAR,
} from "./support/financial-document-workflow-fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function loadReceiptVoucher(persistence: Parameters<typeof getPayment>[0], paymentId: string) {
  return persistence.withContext(async (ctx) => {
    const row = await findFinancialDocumentByLogicalIssuanceKey(
      ctx,
      receiptVoucherLogicalIssuanceKey(paymentId),
    );
    if (!row) return null;
    return loadFinancialDocument(ctx, row.id);
  });
}

async function countReceiptVouchersForPayment(
  persistence: Parameters<typeof getPayment>[0],
  paymentId: string,
): Promise<number> {
  const result = await persistence.withContext((ctx) =>
    ctx.db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
      FROM app.financial_documents
      WHERE payment_id = ${paymentId}::uuid
        AND document_type = 'RECEIPT_VOUCHER'
        AND status = 'ISSUED'
    `),
  );
  return Number(result.rows[0]?.count ?? "0");
}

describe("IMP-028 Slice 8 Payment → RECEIPT_VOUCHER workflow (FD-WP)", () => {
  it("deriveIndianFinancialYear: August 2026 → 2026-27", () => {
    expect(deriveIndianFinancialYear(new Date("2026-08-09T12:00:00.000Z"))).toBe(
      "2026-27",
    );
    expect(WORKFLOW_FINANCIAL_YEAR).toBe("2026-27");
  });

  it("FD-WP01/02/03/08/19/21/25 Payment SUCCEEDED (webhook) issues one sealed RECEIPT_VOUCHER", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp01"),
        },
        opts,
      );

      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );

      const payment = await getPayment(h.persistence, h.actor, {
        paymentId: started.payment.id,
      });
      expect(payment.status).toBe("SUCCEEDED");

      const voucher = await loadReceiptVoucher(h.persistence, payment.id);
      expect(voucher).not.toBeNull();
      expect(voucher!.documentType).toBe("RECEIPT_VOUCHER");
      expect(voucher!.paymentId).toBe(payment.id);
      expect(voucher!.checkoutId).toBe(h.checkoutId);
      expect(voucher!.checkoutSnapshotId).toBe(h.snapshotId);
      expect(voucher!.orderId).toBeNull();
      expect(voucher!.logicalIssuanceKey).toBe(
        receiptVoucherLogicalIssuanceKey(payment.id),
      );
      expect(voucher!.financialYear).toBe("2026-27");
      expect(voucher!.statutoryDocumentNumber.startsWith("RV/2627/")).toBe(true);
      expect(voucher!.issueAt.getTime()).toBe(payment.succeededAt!.getTime());
      expect(voucher!.taxableTotalPaise).toBeGreaterThan(BigInt(0));
      expect(voucher!.lines.length).toBe(1);
      expect(voucher!.lines[0]!.taxComponents.length).toBeGreaterThan(0);
      expect(await countReceiptVouchersForPayment(h.persistence, payment.id)).toBe(
        1,
      );

      const ownershipListed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        {
          orderId: (
            await h.persistence.withContext((ctx) =>
              findOrderByCheckoutId(ctx, h.checkoutId),
            )
          )!.id,
        },
      );
      expect(
        ownershipListed.some((item) => item.financialDocumentId === voucher!.id),
      ).toBe(true);
    });
  });

  it("FD-WP04 Current menu mutation after payment cannot alter voucher facts", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp04"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const before = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(before).not.toBeNull();
      const sealedDescription = before!.lines[0]!.description;

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          UPDATE app.catalog_products
          SET name = 'MUTATED-MENU-NAME-SHOULD-NOT-LEAK'
          WHERE brand_id = ${h.brandId}::uuid
        `);
      });

      const again = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS" || again.disposition === "ISSUED") {
        expect(again.document.lines[0]!.description).toBe(sealedDescription);
        expect(again.document.lines[0]!.description).not.toContain(
          "MUTATED-MENU-NAME",
        );
      }
    });
  });

  it("FD-WP05 Current customer-profile mutation cannot alter voucher facts", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp05"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const before = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(before).not.toBeNull();
      const sealedRecipient = before!.recipientDisplayName;

      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          UPDATE app.customer_profiles
          SET given_name = 'MUTATED-PROFILE-NAME'
          WHERE customer_auth_user_id = ${h.actor.authUserId}
        `);
      });

      const again = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS" || again.disposition === "ISSUED") {
        expect(again.document.recipientDisplayName).toBe(sealedRecipient);
        expect(again.document.recipientDisplayName).not.toBe(
          "MUTATED-PROFILE-NAME",
        );
      }
    });
  });

  it("FD-WP06 Non-SUCCEEDED Payment produces no Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp06"),
        },
        opts,
      );
      expect(started.payment.status).toBe("PROCESSING");
      const outcome = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(outcome.disposition).toBe("SKIPPED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
    });
  });

  it("FD-WP07 Zero-payable Checkout produces no Receipt Voucher", async () => {
    await withCheckoutReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.actors.tree.brand.id,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const brandId = h.actors.tree.brand.id;
      const coupon = await seedFullDiscountCoupon(
        h.persistence,
        brandId,
        h.actors.brandAdminActor,
      );
      const cart = await applyCouponToCustomerCart(
        h.persistence,
        h.actors.customerA,
        brandId,
        h.cartRevision,
        coupon.canonicalCode,
      );
      const ready = await bringCheckoutToReady(
        h.persistence,
        h.actors.customerA,
        cart.id,
        h.addressId,
      );
      expect(ready.grandTotalPaise).toBe(BigInt(0));

      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      await completeZeroPayableCheckout(
        h.persistence,
        h.actors.customerA,
        {
          checkoutId: ready.checkoutId,
          expectedCheckoutRevision: ready.revision,
          idempotencyKey: newIdempotencyKey("wp07-zero"),
        },
        paymentOpts(provider),
      );

      const vouchers = await h.persistence.withContext((ctx) =>
        ctx.db.execute<{ count: string }>(sql`
          SELECT count(*)::text AS count
          FROM app.financial_documents fd
          WHERE fd.checkout_id = ${ready.checkoutId}::uuid
            AND fd.document_type = 'RECEIPT_VOUCHER'
        `),
      );
      expect(Number(vouchers.rows[0]?.count ?? "0")).toBe(0);
    });
  });

  it("FD-WP09 Client-evidence success path produces Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({
        defaultOutcome: "razorpay_standard_checkout",
      });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp09"),
        },
        opts,
      );
      const razorpayOrderId = `order_fake_${started.attempt.id}`;
      await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
          payload: {
            razorpay_payment_id: "pay_wp09_ok",
            razorpay_order_id: razorpayOrderId,
            razorpay_signature: "sig_wp09",
          },
        },
        opts,
      );
      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
      expect(voucher!.documentType).toBe("RECEIPT_VOUCHER");
    });
  });

  it("FD-WP10 Reconciliation success path produces Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp10"),
        },
        opts,
      );
      provider.setOutcome(started.attempt.providerExecutionIdentity, "succeed");
      await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );
      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
    });
  });

  it("FD-WP11 Webhook + client evidence + reconcile → exactly one Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({
        defaultOutcome: "razorpay_standard_checkout",
      });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp11"),
        },
        opts,
      );
      const exec = started.attempt.providerExecutionIdentity;
      const razorpayOrderId = `order_fake_${started.attempt.id}`;

      await submitPaymentClientEvidence(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
          payload: {
            razorpay_payment_id: "pay_wp11_ok",
            razorpay_order_id: razorpayOrderId,
            razorpay_signature: "sig_wp11",
          },
        },
        opts,
      );

      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: exec,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );

      await reconcilePaymentAttempt(
        h.persistence,
        h.actor,
        {
          paymentId: started.payment.id,
          attemptId: started.attempt.id,
        },
        opts,
      );

      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );
      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher!.statutoryDocumentNumber).toMatch(/^RV\/2627\/000001$/);
    });
  });

  it("FD-WP12 Concurrent success orchestration → one Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp12"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );

      const results = await Promise.all([
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
      ]);
      const ids = new Set(
        results
          .filter((r) => r.disposition === "ISSUED" || r.disposition === "ALREADY_EXISTS")
          .map((r) =>
            r.disposition === "ISSUED" || r.disposition === "ALREADY_EXISTS"
              ? r.document.id
              : null,
          ),
      );
      expect(ids.size).toBe(1);
      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );
    });
  });

  it("FD-WP13/14/15/26 Transient issuance failure does not revert Payment; durable retry succeeds once", async () => {
    await withPaymentReadyHarness(async (h) => {
      // No issuer profile yet — automatic hook fails closed; Payment remains SUCCEEDED.
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp13"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );

      const paymentAfterFail = await getPayment(h.persistence, h.actor, {
        paymentId: started.payment.id,
      });
      expect(paymentAfterFail.status).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();

      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });

      const recovery = await recoverMissingReceiptVouchersBatch(h.persistence, {
        limit: 50,
      });
      const item = recovery.results.find((r) => r.paymentId === started.payment.id);
      expect(item?.disposition).toBe("ISSUED");

      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
      const number = voucher!.statutoryDocumentNumber;

      const retry = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(retry.disposition).toBe("ALREADY_EXISTS");
      if (retry.disposition === "ALREADY_EXISTS") {
        expect(retry.document.statutoryDocumentNumber).toBe(number);
      }
      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );

      // Process-restart style: recovery again is idempotent.
      const recovery2 = await recoverMissingReceiptVouchersBatch(h.persistence, {
        limit: 50,
      });
      expect(
        recovery2.results.every((r) => r.paymentId !== started.payment.id),
      ).toBe(true);
    });
  });

  it("FD-WP16 Missing issuer profile fails statutory orchestration; Payment stays SUCCEEDED", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp16"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const payment = await getPayment(h.persistence, h.actor, {
        paymentId: started.payment.id,
      });
      expect(payment.status).toBe("SUCCEEDED");
      await expect(
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
    });
  });

  it("FD-WP17 Profile issuancePolicy=invoice_at_payment does not issue Receipt Voucher", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        issuancePolicy: "invoice_at_payment",
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp17"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
      const direct = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(direct).toEqual({
        disposition: "SKIPPED",
        reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
      });
    });
  });

  it("FD-WP18 Receipt Voucher disabled blocks statutory orchestration without corrupting Payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        enableReceiptVoucher: false,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp18"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
      const direct = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(direct.disposition).toBe("SKIPPED");
      expect(direct).toMatchObject({ reason: "RECEIPT_VOUCHER_DISABLED" });
    });
  });

  it("FD-WP20 Missing/ambiguous Receipt Voucher numbering series fails closed without corrupting Payment", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        createSeries: false,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp20a"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      await expect(
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
      ).rejects.toMatchObject({ code: "NUMBERING_SERIES_NOT_FOUND" });
    });

    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        duplicateSeries: true,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp20b"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      await expect(
        issueReceiptVoucherForSucceededPayment(h.persistence, started.payment.id),
      ).rejects.toMatchObject({ code: "NUMBERING_SERIES_AMBIGUOUS" });
    });
  });

  it("FD-WP22/23 After Order materialization, voucher is discoverable by owner only", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp22"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
      expect(voucher!.orderId).toBeNull();

      const order = await h.persistence.withContext((ctx) =>
        findOrderByCheckoutId(ctx, h.checkoutId),
      );
      expect(order).not.toBeNull();

      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: order!.id },
      );
      expect(listed.some((i) => i.financialDocumentId === voucher!.id)).toBe(true);

      await expect(
        listFinancialDocumentsForCustomerOrder(
          h.persistence,
          h.actors.customerB,
          { orderId: order!.id },
        ),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });

      await expect(
        generateCustomerFinancialDocumentArtifact(
          h.persistence,
          h.actors.customerB,
          { financialDocumentId: voucher!.id },
        ),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });

      await signFinancialDocumentWithRenderedPdf(
        {
          persistence: h.persistence,
          legalEntityId: h.actors.tree.leA.id,
          clock: { now: () => new Date() },
        },
        voucher!.id,
      );
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: voucher!.id },
      );
      expect(artifact.mediaType).toBe("application/pdf");
      expect(artifact.byteLength).toBeGreaterThan(100);
    });
  });

  it("FD-WP24 Receipt Voucher uses existing generic UI/transport without a document-specific route", () => {
    const router = readFileSync(
      path.join(HERE, "../../src/server/customer-commerce/http/router.ts"),
      "utf8",
    );
    const ui = readFileSync(
      path.join(HERE, "../../src/components/ordering/OrderFinancialDocuments.tsx"),
      "utf8",
    );
    expect(router).toMatch(/\/api\/v1\/orders\/\{orderId\}\/financial-documents/);
    expect(router).toMatch(/\/api\/v1\/financial-documents\/\{financialDocumentId\}\/pdf/);
    expect(router).not.toMatch(/receipt-voucher/i);
    expect(ui).toMatch(/listCustomerOrderFinancialDocuments/);
    expect(ui).not.toMatch(/receipt-voucher/i);
  });

  it("FD-WP27 Automatic Receipt Voucher passes requiredIssuancePolicy and succeeds when locked profile is uninvoiced_advance", async () => {
    const orchestratorSource = readFileSync(
      path.join(
        HERE,
        "../../src/server/financial-document/receipt-voucher-from-payment.ts",
      ),
      "utf8",
    );
    expect(orchestratorSource).toMatch(/requiredIssuancePolicy:\s*"uninvoiced_advance"/);

    await withPaymentReadyHarness(async (h) => {
      const config = await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        issuancePolicy: "uninvoiced_advance",
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp27"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
      expect(voucher!.issuerProfileId).toBe(config.issuerProfileId);
      expect(voucher!.documentType).toBe("RECEIPT_VOUCHER");
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
    });
  });

  it("FD-WP28 Soft-eligible profile racing to invoice_at_payment before lock issues nothing", async () => {
    await withPaymentReadyHarness(async (h) => {
      // Succeed Payment first with no profile (hook fails); then seed eligible profile
      // and race the locked gate — avoids mutating already-issued documents.
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp28"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();

      const config = await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        issuancePolicy: "uninvoiced_advance",
      });

      const sequenceBefore = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ next_sequence: string }>(sql`
          select next_sequence::text as next_sequence
          from app.financial_document_numbering_series
          where id = ${config.receiptVoucherSeriesId}::uuid
        `);
        return Number(rows.rows[0]?.next_sequence ?? "0");
      });

      const outcome = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
        {
          afterSoftProfileResolved: async () => {
            await h.persistence.withContext(async (ctx) => {
              await ctx.db.execute(sql`
                update app.financial_document_issuer_profiles
                set issuance_policy = 'invoice_at_payment',
                    updated_at = now()
                where id = ${config.issuerProfileId}::uuid
              `);
            });
          },
        },
      );

      expect(outcome).toEqual({
        disposition: "SKIPPED",
        reason: "ISSUANCE_POLICY_NOT_UNINVOICED_ADVANCE",
      });
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");

      const sequenceAfter = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ next_sequence: string }>(sql`
          select next_sequence::text as next_sequence
          from app.financial_document_numbering_series
          where id = ${config.receiptVoucherSeriesId}::uuid
        `);
        return Number(rows.rows[0]?.next_sequence ?? "0");
      });
      expect(sequenceAfter).toBe(sequenceBefore);
    });
  });

  it("FD-WP29 Historical exact retry ignores later profile drift away from uninvoiced_advance", async () => {
    await withPaymentReadyHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp29"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      const first = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(first).not.toBeNull();

      // Drift the effective issuer-profile set away from a clean
      // uninvoiced_advance-only configuration without mutating the sealed
      // referenced profile (ARCH-G16). NEW issuance would fail closed; historical
      // retry must still return the sealed document before profile resolution.
      await h.persistence.transaction(async (tx) => {
        const { insertIssuerProfile } = await import(
          "../../src/server/financial-document"
        );
        await insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.actors.tree.orgA.id,
          legalEntityId: h.actors.tree.leA.id,
          profileVersion: 2,
          gstLegalName: "NIVEDHYA11 HOSPITALITY PRIVATE LIMITED",
          gstin: "05AAJCN9151F1ZE",
          stateCode: "05",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "8th Floor, C-802, HIG, MDDA Colony",
          registeredAddressCity: "Dehradun",
          registeredAddressPostalCode: "248002",
          defaultSacCode: "996331",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          enableBillOfSupply: false,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          enableCreditNote: true,
          dynamicQrApplicable: false,
          issuancePolicy: "invoice_at_payment",
          validFrom: new Date(Date.now() - 60_000),
          lifecycleStatus: "active",
          now: new Date(),
        });
      });

      const retry = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
        {
          beforeIssuerProfileLock: async () => {
            throw new Error("historical retry must not lock current issuer profile");
          },
        },
      );
      expect(retry.disposition).toBe("ALREADY_EXISTS");
      if (retry.disposition === "ALREADY_EXISTS") {
        expect(retry.document.id).toBe(first!.id);
        expect(retry.document.statutoryDocumentNumber).toBe(
          first!.statutoryDocumentNumber,
        );
      }
      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );

      const issueSource = readFileSync(
        path.join(HERE, "../../src/server/financial-document/issue.ts"),
        "utf8",
      );
      expect(issueSource).toMatch(
        /Historical idempotency: resolve existing issuance BEFORE current profile/,
      );
      expect(issueSource).toMatch(/requiredIssuancePolicy/);
    });
  });

  it("FD-WP30 Locked-profile enableReceiptVoucher=false blocks issuance without corrupting Payment (extends WP18)", async () => {
    // WP18 proves soft early skip when unlocked profile already has
    // enableReceiptVoucher=false. This proves the locked-path gate when soft
    // check still observes an enabled profile.
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp30"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();

      const config = await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
        enableReceiptVoucher: true,
      });

      const outcome = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
        {
          afterSoftProfileResolved: async () => {
            await h.persistence.withContext(async (ctx) => {
              await ctx.db.execute(sql`
                update app.financial_document_issuer_profiles
                set enable_receipt_voucher = false,
                    updated_at = now()
                where id = ${config.issuerProfileId}::uuid
              `);
            });
          },
        },
      );
      expect(outcome).toEqual({
        disposition: "SKIPPED",
        reason: "RECEIPT_VOUCHER_DISABLED",
      });
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();
    });
  });

  it("FD-WP31 Production recovery entrypoint wires recoverMissingReceiptVouchersBatch", async () => {
    const scriptSource = readFileSync(
      path.join(
        HERE,
        "../../scripts/financial-document/recover-missing-receipt-vouchers.ts",
      ),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(path.join(HERE, "../../package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts["financial-document:recover-missing-receipt-vouchers"]).toMatch(
      /recover-missing-receipt-vouchers\.ts/,
    );
    expect(scriptSource).toMatch(/runRecoverMissingReceiptVouchersOperator/);
    expect(scriptSource).toMatch(/getApplicationPersistence/);
    expect(scriptSource).toMatch(/loadConfig/);

    await withPaymentReadyHarness(async (h) => {
      const lines: string[] = [];
      await executeRecoverMissingReceiptVouchersCli({
        persistence: h.persistence,
        argv: ["--limit=5"],
        write: (line) => lines.push(line),
      });
      expect(lines).toHaveLength(1);
      const payload = JSON.parse(lines[0]!) as {
        ok: boolean;
        operation: string;
      };
      expect(payload.ok).toBe(true);
      expect(payload.operation).toBe("recover_missing_receipt_vouchers_batch");
    });
  });

  it("FD-WP32/33 Production recovery catch-up after failed hook; repeat is idempotent", async () => {
    await withPaymentReadyHarness(async (h) => {
      const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
      const opts = paymentOpts(provider);
      const started = await startPayment(
        h.persistence,
        h.actor,
        {
          checkoutId: h.checkoutId,
          expectedCheckoutRevision: h.revision,
          paymentMethodIntent: "upi",
          idempotencyKey: newIdempotencyKey("wp32"),
        },
        opts,
      );
      await verifyAndProcessWebhook(
        h.persistence,
        provider,
        {
          executionIdentity: started.attempt.providerExecutionIdentity,
          outcome: "succeed",
          amountPaise: started.payment.expectedAmountPaise,
        },
        opts,
      );
      expect(
        (await getPayment(h.persistence, h.actor, { paymentId: started.payment.id }))
          .status,
      ).toBe("SUCCEEDED");
      expect(await loadReceiptVoucher(h.persistence, started.payment.id)).toBeNull();

      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.actors.tree.orgA.id,
        legalEntityId: h.actors.tree.leA.id,
      });

      const lines: string[] = [];
      await executeRecoverMissingReceiptVouchersCli({
        persistence: h.persistence,
        argv: ["--limit=50"],
        write: (line) => lines.push(line),
      });
      const firstSummary = JSON.parse(lines[0]!) as {
        issued: number;
        issuedDocuments: Array<{ paymentId: string; statutoryDocumentNumber: string }>;
      };
      expect(firstSummary.issued).toBeGreaterThanOrEqual(1);
      expect(
        firstSummary.issuedDocuments.some((d) => d.paymentId === started.payment.id),
      ).toBe(true);

      const voucher = await loadReceiptVoucher(h.persistence, started.payment.id);
      expect(voucher).not.toBeNull();
      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );

      const repeat = await runRecoverMissingReceiptVouchersOperator(h.persistence, {
        limit: 50,
      });
      expect(repeat.batch.results.every((r) => r.paymentId !== started.payment.id)).toBe(
        true,
      );
      expect(await countReceiptVouchersForPayment(h.persistence, started.payment.id)).toBe(
        1,
      );
      const again = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        started.payment.id,
      );
      expect(again.disposition).toBe("ALREADY_EXISTS");
      if (again.disposition === "ALREADY_EXISTS") {
        expect(again.document.statutoryDocumentNumber).toBe(
          voucher!.statutoryDocumentNumber,
        );
      }
    });
  });
});
