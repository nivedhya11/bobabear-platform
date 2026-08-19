/**
 * IMP-028 C1 — Non-signature statutory particulars compliance (FD-CP01..FD-CP50).
 */
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  allocateStatutoryNumber,
  insertIssuerProfile,
  insertNumberingSeries,
  issueFinancialDocument,
  issueReceiptVoucherForSucceededPayment,
  issueTaxInvoiceForFulfilledOrder,
  loadFinancialDocument,
} from "../../src/server/financial-document";
import { acceptOrder, fulfilOrder } from "../../src/server/order";
import { requestRefund } from "../../src/server/refund";
import {
  FinancialDocumentError,
  formatStatutoryDocumentNumber,
  projectFinancialDocumentRenderModel,
  renderFinancialDocumentHtml,
  STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH,
} from "../../src/shared/financial-document";
import {
  buildIssueCommand,
  closeTrackedPersistenceHandles,
  withFinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";
import {
  seedReceiptVoucherWorkflowConfig,
  seedTaxInvoiceWorkflowConfig,
} from "./support/financial-document-workflow-fixtures";
import {
  orderOpts,
  withCompletedPositiveOrderHarness,
} from "./support/order-fixtures";
import {
  ensureProviderPaymentReference,
} from "./support/refund-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

async function readSeriesNext(
  persistence: {
    withContext: <T>(
      fn: (ctx: {
        db: { execute: (q: unknown) => Promise<{ rows: { n?: string }[] }> };
      }) => Promise<T>,
    ) => Promise<T>;
  },
  seriesId: string,
): Promise<bigint> {
  return persistence.withContext(async (ctx) => {
    const rows = await ctx.db.execute(sql`
      select next_sequence::text as n
      from app.financial_document_numbering_series
      where id = ${seriesId}::uuid
    `);
    return BigInt(String(rows.rows[0]?.n));
  });
}

async function createProcessedRefundForHarness(
  h: Parameters<Parameters<typeof withFinancialDocumentIssuanceHarness>[0]>[0],
) {
  await ensureProviderPaymentReference({
    ...h,
    paymentId: h.paymentId!,
    provider: h.provider,
  } as never);
  h.provider.setRefundOutcome("processed");
  const result = await requestRefund(
    h.persistence,
    h.workforce.support,
    {
      paymentId: h.paymentId!,
      amountPaise: 100n,
      reason: "FD-CP refund foundation",
    },
    { provider: h.provider },
  );
  return result.refund;
}

/** Pure-IGST line set for inter-State issuance / structure tests. */
function pureIgstLines(description: string) {
  return [
    {
      lineNumber: 1,
      description,
      quantity: 1,
      unitPaise: 10000n,
      discountPaise: 0n,
      chargePaise: 0n,
      taxableValuePaise: 10000n,
      sacCode: "9983",
      taxComponents: [
        {
          taxType: "igst" as const,
          rateBps: 500,
          taxableAmountPaise: 10000n,
          taxAmountPaise: 500n,
        },
      ],
    },
  ];
}

async function acceptAndFulfil(
  h: Parameters<Parameters<typeof withCompletedPositiveOrderHarness>[0]>[0],
) {
  const accepted = await acceptOrder(
    h.persistence,
    h.workforce.outletManager,
    {
      orderId: h.order.id,
      expectedOrderRevision: h.order.revision,
    },
    orderOpts(),
  );
  return fulfilOrder(
    h.persistence,
    h.workforce.kitchen,
    {
      orderId: h.order.id,
      expectedOrderRevision: BigInt(accepted.revision),
    },
    orderOpts(),
  );
}

describe("IMP-028 C1 non-signature statutory compliance (FD-CP01..FD-CP50)", () => {
  it("FD-CP01 exactly 16-character statutory number issues successfully", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const prefix = "ABCDEFGHIJ"; // 10 + 6 = 16
      expect(prefix.length + 6).toBe(STATUTORY_DOCUMENT_NUMBER_MAX_LENGTH);
      const series = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "TAX_INVOICE",
          financialYear: h.financialYear,
          seriesCode: "CP01",
          prefix,
          now: h.clock.now(),
        }),
      );
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { numberingSeriesId: series.id }),
      );
      expect(doc.statutoryDocumentNumber).toBe(`${prefix}000001`);
      expect(doc.statutoryDocumentNumber.length).toBe(16);
    });
  });

  it("FD-CP02 17-character candidate fails closed", async () => {
    expect(() => formatStatutoryDocumentNumber("BB/TI/2526/", 1n)).toThrow(
      FinancialDocumentError,
    );
    try {
      formatStatutoryDocumentNumber("BB/TI/2526/", 1n);
    } catch (error) {
      expect((error as FinancialDocumentError).code).toBe("STATUTORY_NUMBER_INVALID");
    }
    expect("BB/TI/2526/000001".length).toBe(17);
  });

  it("FD-CP03 17-character failure consumes no sequence", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const seriesId = randomUUID();
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          insert into app.financial_document_numbering_series (
            id, legal_entity_id, document_type, financial_year, series_code,
            prefix, next_sequence, created_at, updated_at
          ) values (
            ${seriesId}::uuid, ${h.legalEntityId}::uuid, 'TAX_INVOICE',
            ${h.financialYear}, 'CP03BAD', 'BB/TI/2526/', 1,
            ${h.clock.now()}, ${h.clock.now()}
          )
        `);
      });
      const before = await readSeriesNext(h.persistence, seriesId);
      await expect(
        h.persistence.transaction((tx) =>
          allocateStatutoryNumber(tx, seriesId, h.clock.now()),
        ),
      ).rejects.toMatchObject({ code: "STATUTORY_NUMBER_INVALID" });
      const after = await readSeriesNext(h.persistence, seriesId);
      expect(after).toBe(before);
    });
  });

  it("FD-CP04 series becomes invalid when sequence digit growth exceeds 16", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const prefix = "ABCDEFGHIJ"; // 10 chars; 1000000 → 7 digits → 17
      const series = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "TAX_INVOICE",
          financialYear: h.financialYear,
          seriesCode: "CP04",
          prefix,
          now: h.clock.now(),
        }),
      );
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_numbering_series
          set next_sequence = 1000000
          where id = ${series.id}::uuid
        `);
      });
      const before = await readSeriesNext(h.persistence, series.id);
      expect(before).toBe(1000000n);
      await expect(
        h.persistence.transaction((tx) =>
          allocateStatutoryNumber(tx, series.id, h.clock.now()),
        ),
      ).rejects.toMatchObject({ code: "STATUTORY_NUMBER_INVALID" });
      expect(await readSeriesNext(h.persistence, series.id)).toBe(before);
    });
  });

  it("FD-CP05 historical issued number remains unchanged/renderable", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const number = doc.statutoryDocumentNumber;
      expect(number.length).toBeLessThanOrEqual(16);
      const reloaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, doc.id),
      );
      expect(reloaded?.statutoryDocumentNumber).toBe(number);
      const model = projectFinancialDocumentRenderModel(reloaded!);
      expect(model.statutoryDocumentNumber).toBe(number);
      expect(renderFinancialDocumentHtml(model)).toContain(number);
    });
  });

  it("FD-CP06 automatic Receipt Voucher uses valid <=16 statutory number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      const result = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        h.paymentId!,
      );
      expect(result.disposition).toBe("ISSUED");
      if (result.disposition !== "ISSUED") return;
      expect(result.document.statutoryDocumentNumber.length).toBeLessThanOrEqual(16);
      expect(result.document.statutoryDocumentNumber).toMatch(/^RV\/2627\/\d{6}$/);
    });
  });

  it("FD-CP07 automatic Tax Invoice uses valid <=16 statutory number", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      const fulfilled = await acceptAndFulfil(h);
      expect(fulfilled.status).toBe("FULFILLED");
      const result = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(result.disposition);
      if (result.disposition === "SKIPPED") {
        expect.unreachable("expected tax invoice issuance");
      }
      expect(result.document.statutoryDocumentNumber.length).toBeLessThanOrEqual(16);
      expect(result.document.statutoryDocumentNumber).toMatch(/^TI\/2627\/\d{6}$/);
    });
  });

  it("FD-CP08 RCM source authority is explicit, not inferred from tax values", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      // Retire active profile lacking explicit RCM by inserting only a null-RCM active profile.
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_issuer_profiles
          set lifecycle_status = 'retired', retired_at = ${h.clock.now()}, updated_at = ${h.clock.now()}
          where id = ${h.activeIssuerProfileId}::uuid
        `);
      });
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "No RCM Authority LLP",
          gstin: "27NORCM0000N1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "1 RCM Gap",
          defaultSacCode: "9983",
          reverseChargeApplicable: null,
          enableTaxInvoice: true,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          enableCreditNote: true,
          enableBillOfSupply: true,
          issuancePolicy: "uninvoiced_advance",
          validFrom: h.clock.now(),
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );
      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h)),
      ).rejects.toMatchObject({ code: "REVERSE_CHARGE_AUTHORITY_REQUIRED" });
    });
  });

  it("FD-CP09/10 RCM comes from locked profile and is sealed on document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_issuer_profiles
          set reverse_charge_applicable = true, updated_at = ${h.clock.now()}
          where id = ${h.activeIssuerProfileId}::uuid
        `);
      });
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      expect(doc.reverseChargeApplicable).toBe(true);
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
    });
  });

  it("FD-CP11 profile RCM mutation after issuance does not change rendered history", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      expect(doc.reverseChargeApplicable).toBe(false);
      // Referenced profile mutation must fail closed (ARCH-G16).
      let mutationError: unknown = null;
      try {
        await h.persistence.withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.financial_document_issuer_profiles
            set reverse_charge_applicable = true, updated_at = ${h.clock.now()}
            where id = ${doc.issuerProfileId}::uuid
          `);
        });
      } catch (error) {
        mutationError = error;
      }
      expect(mutationError).toBeTruthy();
      const mutationText =
        mutationError instanceof Error
          ? `${mutationError.message}\n${String((mutationError as { cause?: unknown }).cause ?? "")}`
          : String(mutationError);
      expect(mutationText).toMatch(/immutable|Issuer profile referenced/i);

      const reloaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, doc.id),
      );
      expect(reloaded?.reverseChargeApplicable).toBe(false);
      const html = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(reloaded!),
      );
      expect(html).toContain("Reverse charge applicable");
      expect(html).toContain(">No<");
    });
  });

  it("FD-CP12 profile race before lock cannot mix RCM/profile facts", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      let releaseHold!: () => void;
      const hold = new Promise<void>((resolve) => {
        releaseHold = resolve;
      });
      let signalLocked!: () => void;
      const locked = new Promise<void>((resolve) => {
        signalLocked = resolve;
      });

      const issuePromise = issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h),
        {
          afterIssuerProfileLocked: async () => {
            signalLocked();
            await hold;
          },
        },
      );
      await locked;

      const insertPromise = h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 9,
          gstLegalName: "Race RCM LLP",
          gstin: "27RACER0000R1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "9 Race Way",
          defaultSacCode: "9983",
          reverseChargeApplicable: true,
          enableTaxInvoice: true,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          enableCreditNote: true,
          enableBillOfSupply: true,
          issuancePolicy: "uninvoiced_advance",
          validFrom: h.clock.now(),
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );

      await new Promise((r) => setTimeout(r, 300));
      releaseHold();
      const doc = await issuePromise;
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
      expect(doc.reverseChargeApplicable).toBe(false);
      expect(doc.supplierGstin).toBe("27AAAAA0000A1Z5");
      await insertPromise;
    });
  });

  it("FD-CP13 historical idempotent retry succeeds after profile RCM drift", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-cp13-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const first = await issueFinancialDocument(h.persistence, command);
      expect(first.reverseChargeApplicable).toBe(false);

      // Newer eligible profile with different RCM — historical retry must not
      // re-resolve profile or reseal RCM (same pattern as FD-IC01).
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 4,
          gstLegalName: "Drift RCM LLP",
          gstin: "27DRIFT0000D1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "4 Drift Rd",
          defaultSacCode: "9983",
          reverseChargeApplicable: true,
          enableTaxInvoice: true,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          enableCreditNote: true,
          enableBillOfSupply: true,
          issuancePolicy: "uninvoiced_advance",
          validFrom: h.clock.now(),
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );

      const retry = await issueFinancialDocument(h.persistence, command);
      expect(retry.id).toBe(first.id);
      expect(retry.reverseChargeApplicable).toBe(false);
      expect(retry.statutoryDocumentNumber).toBe(first.statutoryDocumentNumber);
    });
  });

  it("FD-CP14 missing required RCM fails before numbering", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await readSeriesNext(h.persistence, h.numberingSeriesId);
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_issuer_profiles
          set reverse_charge_applicable = null, updated_at = ${h.clock.now()}
          where id = ${h.activeIssuerProfileId}::uuid
        `);
      });
      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h)),
      ).rejects.toMatchObject({ code: "REVERSE_CHARGE_AUTHORITY_REQUIRED" });
      expect(await readSeriesNext(h.persistence, h.numberingSeriesId)).toBe(before);
    });
  });

  it("FD-CP15 renderer outputs RCM for TAX_INVOICE", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const html = renderFinancialDocumentHtml(projectFinancialDocumentRenderModel(doc));
      expect(html).toContain("Reverse charge applicable");
      expect(html).toMatch(/Reverse charge applicable<\/dt><dd>No<\/dd>/);
    });
  });

  it("FD-CP16 renderer outputs RCM for RECEIPT_VOUCHER", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { documentType: "RECEIPT_VOUCHER" }),
      );
      const html = renderFinancialDocumentHtml(projectFinancialDocumentRenderModel(doc));
      expect(html).toContain("Reverse charge applicable");
    });
  });

  it("FD-CP17 CREDIT_NOTE renderer does not invent mandatory RCM", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      // Retire TI-capable profile RCM requirement path and issue CN with null RCM seal OK.
      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp17-cn-${randomUUID()}`,
        }),
      );
      expect(cn.documentType).toBe("CREDIT_NOTE");
      const html = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(cn, { priorFinancialDocument: ti }),
      );
      // May seal profile boolean if present, but must not invent a mandatory CN RCM line
      // when reverseChargeDisplay is type-gated off for CREDIT_NOTE.
      expect(html).not.toMatch(/Reverse charge applicable/);
    });
  });

  it("FD-CP18 REFUND_VOUCHER without prior RECEIPT_VOUCHER is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const refund = await createProcessedRefundForHarness(h);
      const before = await readSeriesNext(h.persistence, h.refundVoucherSeriesId);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "REFUND_VOUCHER",
            priorFinancialDocumentId: null,
            refundId: refund.id,
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER",
      });
      expect(await readSeriesNext(h.persistence, h.refundVoucherSeriesId)).toBe(before);
    });
  });

  it("FD-CP19 REFUND_VOUCHER with exact valid prior RECEIPT_VOUCHER passes", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { documentType: "RECEIPT_VOUCHER" }),
      );
      const refund = await createProcessedRefundForHarness(h);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp19-${randomUUID()}`,
        }),
      );
      expect(rfv.priorFinancialDocumentId).toBe(rv.id);
      expect(rfv.priorDocumentType).toBe("RECEIPT_VOUCHER");
    });
  });

  it("FD-CP20 RFV prior with unrelated commercial graph is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const refund = await createProcessedRefundForHarness(h);
      await withCompletedPositiveOrderHarness(async (foreign) => {
        await seedReceiptVoucherWorkflowConfig(foreign.persistence, {
          brandId: foreign.brandId,
          organizationId: foreign.tree.orgA.id,
          legalEntityId: foreign.tree.leA.id,
        });
        const foreignRv = await issueReceiptVoucherForSucceededPayment(
          foreign.persistence,
          foreign.paymentId!,
        );
        expect(foreignRv.disposition).toBe("ISSUED");
        if (foreignRv.disposition !== "ISSUED") return;
        await expect(
          issueFinancialDocument(
            h.persistence,
            buildIssueCommand(h, {
              documentType: "REFUND_VOUCHER",
              priorFinancialDocumentId: foreignRv.document.id,
              refundId: refund.id,
              logicalIssuanceKey: `fd-cp20-${randomUUID()}`,
            }),
          ),
        ).rejects.toMatchObject({ code: "PRIOR_DOCUMENT_INVALID" });
      });
    });
  });

  it("FD-CP21 RFV prior TAX_INVOICE is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const refund = await createProcessedRefundForHarness(h);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "REFUND_VOUCHER",
            priorFinancialDocumentId: ti.id,
            refundId: refund.id,
            logicalIssuanceKey: `fd-cp21-${randomUUID()}`,
          }),
        ),
      ).rejects.toMatchObject({
        code: "REFUND_VOUCHER_REQUIRES_PRIOR_RECEIPT_VOUCHER",
      });
    });
  });

  it("FD-CP22 RFV renders prior Receipt Voucher statutory number + date, not UUID", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { documentType: "RECEIPT_VOUCHER" }),
      );
      const refund = await createProcessedRefundForHarness(h);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp22-${randomUUID()}`,
        }),
      );
      const html = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(rfv, { priorFinancialDocument: rv }),
      );
      expect(html).toContain(rv.statutoryDocumentNumber);
      expect(html).not.toContain(rv.id);
      expect(html).toContain("Prior document");
      expect(html).toContain("Receipt Voucher");
    });
  });

  it("FD-CP23/24 CREDIT_NOTE prior TAX_INVOICE remains; CN→RV rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp23-${randomUUID()}`,
        }),
      );
      expect(cn.priorDocumentType).toBe("TAX_INVOICE");

      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp24-rv-${randomUUID()}`,
        }),
      );
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "CREDIT_NOTE",
            priorFinancialDocumentId: rv.id,
            logicalIssuanceKey: `fd-cp24-cn-${randomUUID()}`,
          }),
        ),
      ).rejects.toMatchObject({ code: "CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE" });
    });
  });

  it("FD-CP25 automatic RV contains recipient name/address", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      const result = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        h.paymentId!,
      );
      expect(result.disposition).toBe("ISSUED");
      if (result.disposition !== "ISSUED") return;
      expect(result.document.recipientDisplayName?.trim().length).toBeGreaterThan(0);
      expect(result.document.recipientAddress?.trim().length).toBeGreaterThan(0);
      const html = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(result.document),
      );
      expect(html).toContain("Recipient");
      expect(html).toContain(result.document.recipientDisplayName!);
    });
  });

  it("FD-CP26 automatic TI contains recipient particulars for current BOBA path", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      await acceptAndFulfil(h);
      const result = await issueTaxInvoiceForFulfilledOrder(
        h.persistence,
        h.order.id,
      );
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(result.disposition);
      if (result.disposition === "SKIPPED") {
        expect.unreachable("expected tax invoice issuance");
      }
      expect(result.document.recipientDisplayName?.trim().length).toBeGreaterThan(0);
      expect(result.document.recipientAddress?.trim().length).toBeGreaterThan(0);
      expect(result.document.placeOfSupplyStateCode).toMatch(/^\d{2}$/);
    });
  });

  it("FD-CP27 missing mandatory recipient particular fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await readSeriesNext(h.persistence, h.receiptVoucherSeriesId);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "RECEIPT_VOUCHER",
            recipientDisplayName: " ",
            recipientAddress: "12 Street",
          }),
        ),
      ).rejects.toMatchObject({ code: "RECIPIENT_PARTICULARS_REQUIRED" });
      expect(await readSeriesNext(h.persistence, h.receiptVoucherSeriesId)).toBe(before);
    });
  });

  it("FD-CP28 intra-State path unchanged; valid IGST inter-State TAX_INVOICE issues with State name/code", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const intra = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      expect(intra.placeOfSupplyStateCode).toBe("27");
      expect(intra.supplierStateCode).toBe("27");
      const intraHtml = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(intra),
      );
      expect(intraHtml).toContain("Place of supply (state code)");
      expect(intraHtml).toContain("27");
      expect(intraHtml).not.toContain("<dt>Place of supply (state)</dt>");
      expect(projectFinancialDocumentRenderModel(intra).tax.placeOfSupplyStateName).toBeNull();

      const inter = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-cp28-igst-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: [
            {
              lineNumber: 1,
              description: "Inter-state IGST line",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "igst",
                  rateBps: 500,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 500n,
                },
              ],
            },
          ],
        }),
      );
      expect(inter.placeOfSupplyStateCode).toBe("29");
      expect(inter.supplierStateCode).toBe("27");
      const interModel = projectFinancialDocumentRenderModel(inter);
      expect(interModel.tax.placeOfSupplyStateCode).toBe("29");
      expect(interModel.tax.placeOfSupplyStateName).toBe("Karnataka");
      const interHtml = renderFinancialDocumentHtml(interModel);
      expect(interHtml).toContain("Place of supply (state)");
      expect(interHtml).toContain("Karnataka");
      expect(interHtml).toContain("29");
    });
  });

  it("FD-CP29 document nature/title remains correct for all FD types", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp29-rv-${randomUUID()}`,
        }),
      );
      const refund = await createProcessedRefundForHarness(h);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp29-rfv-${randomUUID()}`,
        }),
      );
      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp29-cn-${randomUUID()}`,
        }),
      );
      expect(projectFinancialDocumentRenderModel(ti).statutoryTitle).toBe("Tax Invoice");
      expect(projectFinancialDocumentRenderModel(rv).statutoryTitle).toBe("Receipt Voucher");
      expect(projectFinancialDocumentRenderModel(rfv, { priorFinancialDocument: rv }).statutoryTitle).toBe(
        "Refund Voucher",
      );
      expect(
        projectFinancialDocumentRenderModel(cn, { priorFinancialDocument: ti }).statutoryTitle,
      ).toBe("Credit Note");
    });
  });

  it("FD-CP30 no RefundStatutoryDecision / automatic RFV/CN orchestration introduced", () => {
    const root = path.resolve(__dirname, "../..");
    const sqlFiles = readdirSync(path.join(root, "drizzle")).filter((f) =>
      f.endsWith(".sql"),
    );
    expect(sqlFiles.some((f) => f.includes("0022"))).toBe(true);
    for (const file of sqlFiles.filter((f) => f.startsWith("0022"))) {
      const body = readFileSync(path.join(root, "drizzle", file), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision|refund_statutory_decision/i);
      expect(body).not.toMatch(/section.?34|partial.?reversal.?allocation/i);
    }
    const fdServer = path.join(root, "src/server/financial-document");
    for (const name of readdirSync(fdServer)) {
      if (!name.endsWith(".ts")) continue;
      const body = readFileSync(path.join(fdServer, name), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision/);
      expect(body).not.toMatch(/issueRefundVoucherForProcessedRefund/);
      expect(body).not.toMatch(/issueCreditNoteForProcessedRefund/);
    }
  });

  it("FD-CP31 valid D-365 inter-State / pure-IGST TAX_INVOICE issues successfully (tax structure ≠ State-name gate)", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-cp31-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: [
            {
              lineNumber: 1,
              description: "Pure IGST",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "igst",
                  rateBps: 500,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 500n,
                },
              ],
            },
          ],
        }),
      );
      expect(doc.status).toBe("ISSUED");
      expect(doc.placeOfSupplyStateCode).toBe("29");
      expect(
        doc.lines[0]!.taxComponents.map((c) => c.taxType),
      ).toEqual(["igst"]);
    });
  });

  it("FD-CP32 inter-State TAX_INVOICE seals place-of-supply State code; name from local registry", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-cp32-${randomUUID()}`,
          placeOfSupplyStateCode: "06",
          lines: [
            {
              lineNumber: 1,
              description: "IGST Haryana",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "igst",
                  rateBps: 500,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 500n,
                },
              ],
            },
          ],
        }),
      );
      expect(doc.placeOfSupplyStateCode).toBe("06");
      expect(doc.supplierStateCode).toBe("27");
      const model = projectFinancialDocumentRenderModel(doc);
      expect(model.tax.placeOfSupplyStateCode).toBe("06");
      expect(model.tax.placeOfSupplyStateName).toBe("Haryana");
    });
  });

  it("FD-CP33 renderer displays required State name + code for inter-State Tax Invoice", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-cp33-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: [
            {
              lineNumber: 1,
              description: "IGST render",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "igst",
                  rateBps: 500,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 500n,
                },
              ],
            },
          ],
        }),
      );
      const html = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(doc),
      );
      expect(html).toContain("Place of supply (state)");
      expect(html).toContain("Karnataka");
      expect(html).toContain("Place of supply (state code)");
      expect(html).toContain("29");
    });
  });

  it("FD-CP34/35 missing/unmapped inter-State State authority fails before numbering for TAX_INVOICE (required type)", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await readSeriesNext(h.persistence, h.numberingSeriesId);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: `fd-cp34-${randomUUID()}`,
            placeOfSupplyStateCode: "00",
            lines: [
              {
                lineNumber: 1,
                description: "Unmapped POS",
                quantity: 1,
                unitPaise: 10000n,
                discountPaise: 0n,
                chargePaise: 0n,
                taxableValuePaise: 10000n,
                sacCode: "9983",
                taxComponents: [
                  {
                    taxType: "igst",
                    rateBps: 500,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 500n,
                  },
                ],
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      expect(await readSeriesNext(h.persistence, h.numberingSeriesId)).toBe(before);

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: `fd-cp34-null-${randomUUID()}`,
            placeOfSupplyStateCode: null,
            lines: [
              {
                lineNumber: 1,
                description: "Missing POS",
                quantity: 1,
                unitPaise: 10000n,
                discountPaise: 0n,
                chargePaise: 0n,
                taxableValuePaise: 10000n,
                sacCode: "9983",
                taxComponents: [
                  {
                    taxType: "igst",
                    rateBps: 500,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 500n,
                  },
                ],
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      expect(await readSeriesNext(h.persistence, h.numberingSeriesId)).toBe(before);
    });
  });

  it("FD-CP36 historical inter-State document remains stable after profile change", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-cp36-${randomUUID()}`;
      const command = buildIssueCommand(h, {
        logicalIssuanceKey: key,
        placeOfSupplyStateCode: "29",
        lines: [
          {
            lineNumber: 1,
            description: "Historical IGST",
            quantity: 1,
            unitPaise: 10000n,
            discountPaise: 0n,
            chargePaise: 0n,
            taxableValuePaise: 10000n,
            sacCode: "9983",
            taxComponents: [
              {
                taxType: "igst",
                rateBps: 500,
                taxableAmountPaise: 10000n,
                taxAmountPaise: 500n,
              },
            ],
          },
        ],
      });
      const first = await issueFinancialDocument(h.persistence, command);
      const firstNumber = first.statutoryDocumentNumber;
      const firstHtml = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(first),
      );

      // Newer eligible profile — historical retry must not revalidate State
      // particulars or reseal (same CP13 / FD-IC01 pattern).
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 99,
          gstLegalName: "Drifted Inter-State Profile",
          gstin: "27BBBBB0000B1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "99 Drift Street",
          registeredAddressCity: "Mumbai",
          registeredAddressPostalCode: "400001",
          defaultSacCode: "9983",
          reverseChargeApplicable: true,
          enableTaxInvoice: true,
          enableCreditNote: true,
          enableBillOfSupply: true,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          issuancePolicy: "uninvoiced_advance",
          validFrom: h.clock.now(),
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );

      const retry = await issueFinancialDocument(h.persistence, command);
      expect(retry.id).toBe(first.id);
      expect(retry.statutoryDocumentNumber).toBe(firstNumber);
      expect(retry.placeOfSupplyStateCode).toBe("29");
      expect(retry.reverseChargeApplicable).toBe(false);
      const retryHtml = renderFinancialDocumentHtml(
        projectFinancialDocumentRenderModel(retry),
      );
      expect(retryHtml).toBe(firstHtml);
    });
  });

  it("FD-CP37 intra-State automatic Receipt Voucher remains unchanged", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedReceiptVoucherWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      const rv = await issueReceiptVoucherForSucceededPayment(
        h.persistence,
        h.paymentId!,
      );
      expect(rv.disposition).toBe("ISSUED");
      if (rv.disposition !== "ISSUED") return;
      expect(rv.document.supplierStateCode).toBe(rv.document.placeOfSupplyStateCode);
      const rvModel = projectFinancialDocumentRenderModel(rv.document);
      expect(rvModel.tax.placeOfSupplyStateName).toBeNull();
      const rvHtml = renderFinancialDocumentHtml(rvModel);
      expect(rvHtml).toContain("Place of supply (state code)");
      expect(rvHtml).not.toContain("<dt>Place of supply (state)</dt>");
    });
  });

  it("FD-CP38 intra-State automatic Tax Invoice remains unchanged", async () => {
    await withCompletedPositiveOrderHarness(async (h) => {
      await seedTaxInvoiceWorkflowConfig(h.persistence, {
        brandId: h.brandId,
        organizationId: h.tree.orgA.id,
        legalEntityId: h.tree.leA.id,
      });
      const fulfilled = await acceptAndFulfil(h);
      expect(fulfilled.status).toBe("FULFILLED");
      const ti = await issueTaxInvoiceForFulfilledOrder(h.persistence, h.order.id);
      expect(["ISSUED", "ALREADY_EXISTS"]).toContain(ti.disposition);
      if (ti.disposition === "SKIPPED") {
        expect.unreachable("expected tax invoice issuance");
      }
      expect(ti.document.supplierStateCode).toBe(ti.document.placeOfSupplyStateCode);
      const tiModel = projectFinancialDocumentRenderModel(ti.document);
      expect(tiModel.tax.placeOfSupplyStateName).toBeNull();
      const tiHtml = renderFinancialDocumentHtml(tiModel);
      expect(tiHtml).toContain("Place of supply (state code)");
      expect(tiHtml).not.toContain("<dt>Place of supply (state)</dt>");
    });
  });

  it("FD-CP39 pure IGST accepted; mixed CGST+IGST rejected (tax structure independent of State-name gate)", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const pure = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-cp39-pure-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: [
            {
              lineNumber: 1,
              description: "Pure IGST",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "igst",
                  rateBps: 500,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 500n,
                },
              ],
            },
          ],
        }),
      );
      expect(pure.status).toBe("ISSUED");

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: `fd-cp39-mixed-${randomUUID()}`,
            placeOfSupplyStateCode: "29",
            lines: [
              {
                lineNumber: 1,
                description: "Mixed illegal",
                quantity: 1,
                unitPaise: 10000n,
                discountPaise: 0n,
                chargePaise: 0n,
                taxableValuePaise: 10000n,
                sacCode: "9983",
                taxComponents: [
                  {
                    taxType: "cgst",
                    rateBps: 250,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 250n,
                  },
                  {
                    taxType: "igst",
                    rateBps: 500,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 500n,
                  },
                ],
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "TAX_COMPONENT_INVALID" });
    });
  });

  it("FD-CP40 no D-366/signature/IMP-029 implementation bleed", () => {
    const root = path.resolve(__dirname, "../..");
    const sqlFiles = readdirSync(path.join(root, "drizzle")).filter((f) =>
      f.endsWith(".sql"),
    );
    expect(sqlFiles.some((f) => f.includes("0022"))).toBe(true);
    expect(sqlFiles.some((f) => f.includes("0023_financial_document_signature_foundation"))).toBe(
      true,
    );
    for (const file of sqlFiles.filter((f) => f.startsWith("0022"))) {
      const body = readFileSync(path.join(root, "drizzle", file), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision|refund_statutory_decision/i);
      expect(body).not.toMatch(/section.?34|partial.?reversal.?allocation/i);
      expect(body).not.toMatch(/place_of_supply_state_name/i);
    }
    const migration0023 = readFileSync(
      path.join(root, "drizzle/0023_financial_document_signature_foundation.sql"),
      "utf8",
    );
    expect(migration0023).toMatch(/authorised_signer_profiles|signature_artifacts/i);
    expect(migration0023).not.toMatch(/RefundStatutoryDecision|refund_statutory_decision/i);
    expect(migration0023).not.toMatch(/signPdf|private_key|pkcs12/i);
    const fdServer = path.join(root, "src/server/financial-document");
    for (const name of readdirSync(fdServer)) {
      if (!name.endsWith(".ts")) continue;
      const body = readFileSync(path.join(fdServer, name), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision/);
      expect(body).not.toMatch(/issueRefundVoucherForProcessedRefund/);
      expect(body).not.toMatch(/issueCreditNoteForProcessedRefund/);
      expect(body).not.toMatch(/signPdf|IRN/i);
    }
    const fdShared = path.join(root, "src/shared/financial-document");
    for (const name of readdirSync(fdShared)) {
      if (!name.endsWith(".ts")) continue;
      const body = readFileSync(path.join(fdShared, name), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision/);
      expect(body).not.toMatch(/IMP-029/);
    }
  });

  it("FD-CP41 inter-State TAX_INVOICE requires valid State code/name and issues when supplied", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "TAX_INVOICE",
          logicalIssuanceKey: `fd-cp41-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: pureIgstLines("CP41 IGST TI"),
        }),
      );
      expect(doc.status).toBe("ISSUED");
      expect(doc.placeOfSupplyStateCode).toBe("29");
      const model = projectFinancialDocumentRenderModel(doc);
      expect(model.tax.placeOfSupplyStateName).toBe("Karnataka");
      const html = renderFinancialDocumentHtml(model);
      expect(html).toContain("Karnataka");
      expect(html).toContain("29");
    });
  });

  it("FD-CP42 inter-State TAX_INVOICE missing/unmapped State authority fails before numbering", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await readSeriesNext(h.persistence, h.numberingSeriesId);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "TAX_INVOICE",
            logicalIssuanceKey: `fd-cp42-${randomUUID()}`,
            placeOfSupplyStateCode: null,
            lines: pureIgstLines("CP42 missing POS"),
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "TAX_INVOICE",
            logicalIssuanceKey: `fd-cp42-unmap-${randomUUID()}`,
            placeOfSupplyStateCode: "00",
            lines: pureIgstLines("CP42 unmapped POS"),
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      expect(await readSeriesNext(h.persistence, h.numberingSeriesId)).toBe(before);
    });
  });

  it("FD-CP43 inter-State RECEIPT_VOUCHER requires valid State code/name and succeeds", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp43-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: pureIgstLines("CP43 IGST RV"),
        }),
      );
      expect(doc.status).toBe("ISSUED");
      expect(doc.documentType).toBe("RECEIPT_VOUCHER");
      expect(doc.placeOfSupplyStateCode).toBe("29");
      const model = projectFinancialDocumentRenderModel(doc);
      expect(model.tax.placeOfSupplyStateName).toBe("Karnataka");
    });
  });

  it("FD-CP44 inter-State RECEIPT_VOUCHER missing/unmapped State authority fails before numbering", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await readSeriesNext(h.persistence, h.receiptVoucherSeriesId);
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "RECEIPT_VOUCHER",
            logicalIssuanceKey: `fd-cp44-${randomUUID()}`,
            placeOfSupplyStateCode: null,
            lines: pureIgstLines("CP44 missing POS"),
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "RECEIPT_VOUCHER",
            logicalIssuanceKey: `fd-cp44-unmap-${randomUUID()}`,
            placeOfSupplyStateCode: "00",
            lines: pureIgstLines("CP44 unmapped POS"),
          }),
        ),
      ).rejects.toMatchObject({ code: "UNSUPPORTED_INTER_STATE_PARTICULARS" });
      expect(await readSeriesNext(h.persistence, h.receiptVoucherSeriesId)).toBe(
        before,
      );
    });
  });

  it("FD-CP45 pure-IGST REFUND_VOUCHER is NOT rejected solely for absent POS State-name authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp45-rv-${randomUUID()}`,
        }),
      );
      const refund = await createProcessedRefundForHarness(h);
      const before = await readSeriesNext(h.persistence, h.refundVoucherSeriesId);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp45-rfv-${randomUUID()}`,
          placeOfSupplyStateCode: null,
          lines: pureIgstLines("CP45 IGST RFV no POS name"),
        }),
      );
      expect(rfv.status).toBe("ISSUED");
      expect(rfv.documentType).toBe("REFUND_VOUCHER");
      expect(rfv.placeOfSupplyStateCode).toBeNull();
      expect(await readSeriesNext(h.persistence, h.refundVoucherSeriesId)).toBe(
        before + 1n,
      );
    });
  });

  it("FD-CP46 pure-IGST CREDIT_NOTE is NOT rejected solely for absent POS State-name authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "TAX_INVOICE",
          logicalIssuanceKey: `fd-cp46-ti-${randomUUID()}`,
        }),
      );
      const before = await readSeriesNext(h.persistence, h.creditNoteSeriesId);
      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp46-cn-${randomUUID()}`,
          placeOfSupplyStateCode: null,
          lines: pureIgstLines("CP46 IGST CN no POS name"),
        }),
      );
      expect(cn.status).toBe("ISSUED");
      expect(cn.documentType).toBe("CREDIT_NOTE");
      expect(cn.placeOfSupplyStateCode).toBeNull();
      expect(await readSeriesNext(h.persistence, h.creditNoteSeriesId)).toBe(
        before + 1n,
      );
    });
  });

  it("FD-CP47 RFV with sealed POS State code may render State name/code without issuance prerequisite", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp47-rv-${randomUUID()}`,
        }),
      );
      const refund = await createProcessedRefundForHarness(h);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp47-rfv-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: pureIgstLines("CP47 IGST RFV sealed POS"),
        }),
      );
      expect(rfv.status).toBe("ISSUED");
      const model = projectFinancialDocumentRenderModel(rfv, {
        priorFinancialDocument: rv,
      });
      expect(model.tax.placeOfSupplyStateCode).toBe("29");
      expect(model.tax.placeOfSupplyStateName).toBe("Karnataka");
      const html = renderFinancialDocumentHtml(model);
      expect(html).toContain("Place of supply (state)");
      expect(html).toContain("Karnataka");
      expect(html).toContain("29");
    });
  });

  it("FD-CP48 CN with sealed POS State code may render State name/code without issuance prerequisite", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "TAX_INVOICE",
          logicalIssuanceKey: `fd-cp48-ti-${randomUUID()}`,
        }),
      );
      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp48-cn-${randomUUID()}`,
          placeOfSupplyStateCode: "06",
          lines: pureIgstLines("CP48 IGST CN sealed POS"),
        }),
      );
      expect(cn.status).toBe("ISSUED");
      const model = projectFinancialDocumentRenderModel(cn, {
        priorFinancialDocument: ti,
      });
      expect(model.tax.placeOfSupplyStateCode).toBe("06");
      expect(model.tax.placeOfSupplyStateName).toBe("Haryana");
      const html = renderFinancialDocumentHtml(model);
      expect(html).toContain("Haryana");
      expect(html).toContain("06");
    });
  });

  it("FD-CP49 pure IGST accepted across applicable types; mixed IGST+CGST/SGST rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ti = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "TAX_INVOICE",
          logicalIssuanceKey: `fd-cp49-ti-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: pureIgstLines("CP49 TI pure IGST"),
        }),
      );
      expect(ti.status).toBe("ISSUED");

      const rv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-cp49-rv-${randomUUID()}`,
          placeOfSupplyStateCode: "29",
          lines: pureIgstLines("CP49 RV pure IGST"),
        }),
      );
      expect(rv.status).toBe("ISSUED");

      const refund = await createProcessedRefundForHarness(h);
      const rfv = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "REFUND_VOUCHER",
          priorFinancialDocumentId: rv.id,
          refundId: refund.id,
          logicalIssuanceKey: `fd-cp49-rfv-${randomUUID()}`,
          placeOfSupplyStateCode: null,
          lines: pureIgstLines("CP49 RFV pure IGST"),
        }),
      );
      expect(rfv.status).toBe("ISSUED");

      const cn = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: ti.id,
          logicalIssuanceKey: `fd-cp49-cn-${randomUUID()}`,
          placeOfSupplyStateCode: null,
          lines: pureIgstLines("CP49 CN pure IGST"),
        }),
      );
      expect(cn.status).toBe("ISSUED");

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "TAX_INVOICE",
            logicalIssuanceKey: `fd-cp49-mixed-${randomUUID()}`,
            placeOfSupplyStateCode: "29",
            lines: [
              {
                lineNumber: 1,
                description: "Mixed illegal",
                quantity: 1,
                unitPaise: 10000n,
                discountPaise: 0n,
                chargePaise: 0n,
                taxableValuePaise: 10000n,
                sacCode: "9983",
                taxComponents: [
                  {
                    taxType: "cgst",
                    rateBps: 250,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 250n,
                  },
                  {
                    taxType: "igst",
                    rateBps: 500,
                    taxableAmountPaise: 10000n,
                    taxAmountPaise: 500n,
                  },
                ],
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "TAX_COMPONENT_INVALID" });
    });
  });

  it("FD-CP50 no migration/D-366/signature/IMP-029 bleed after type-aware State-name correction", () => {
    const root = path.resolve(__dirname, "../..");
    const sqlFiles = readdirSync(path.join(root, "drizzle")).filter((f) =>
      f.endsWith(".sql"),
    );
    expect(sqlFiles.some((f) => f.includes("0022"))).toBe(true);
    expect(sqlFiles.some((f) => f.includes("0023_financial_document_signature_foundation"))).toBe(
      true,
    );
    expect(
      readFileSync(
        path.join(root, "src/shared/financial-document/constants.ts"),
        "utf8",
      ),
    ).toMatch(
      /INTERSTATE_STATE_NAME_REQUIRED_TYPES\s*=\s*\[[^\]]*TAX_INVOICE[^\]]*RECEIPT_VOUCHER[^\]]*\]/s,
    );
    expect(
      readFileSync(
        path.join(root, "src/shared/financial-document/constants.ts"),
        "utf8",
      ),
    ).not.toMatch(
      /INTERSTATE_STATE_NAME_REQUIRED_TYPES\s*=\s*\[[^\]]*(REFUND_VOUCHER|CREDIT_NOTE)[^\]]*\]/s,
    );
    for (const file of sqlFiles.filter((f) => f.startsWith("0022"))) {
      const body = readFileSync(path.join(root, "drizzle", file), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision|refund_statutory_decision/i);
      expect(body).not.toMatch(/place_of_supply_state_name/i);
    }
    const migration0023 = readFileSync(
      path.join(root, "drizzle/0023_financial_document_signature_foundation.sql"),
      "utf8",
    );
    expect(migration0023).not.toMatch(/RefundStatutoryDecision|refund_statutory_decision/i);
    expect(migration0023).not.toMatch(/signPdf|private_key|pkcs12/i);
    const fdServer = path.join(root, "src/server/financial-document");
    for (const name of readdirSync(fdServer)) {
      if (!name.endsWith(".ts")) continue;
      const body = readFileSync(path.join(fdServer, name), "utf8");
      expect(body).not.toMatch(/RefundStatutoryDecision/);
      expect(body).not.toMatch(/signPdf|IRN/i);
      expect(body).not.toMatch(/IMP-029/);
    }
  });
});
