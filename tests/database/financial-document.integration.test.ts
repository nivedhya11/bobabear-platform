/**
 * IMP-028 Financial Document persistence foundation tests (FD-P01..FD-P16).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  allocateStatutoryNumber,
  insertIssuedFinancialDocument,
  insertIssuerProfile,
  insertNumberingSeries,
  loadFinancialDocument,
  updateIssuedFinancialDocument,
} from "../../src/server/financial-document";
import {
  FinancialDocumentError,
  assertFinancialDocumentStatutoryType,
} from "../../src/shared/financial-document";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "./support/cart-fixtures";
import {
  closeTrackedPersistenceHandles,
  issueTaxInvoiceForHarness,
  reloadDocument,
  withFinancialDocumentReadyHarness,
} from "./support/financial-document-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-028 Financial Document schema", () => {
  it("creates Financial Document tables and immutability protections", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute(sql`
          select table_name
          from information_schema.tables
          where table_schema = 'app'
            and table_name in (
              'financial_documents',
              'financial_document_lines',
              'financial_document_line_tax_components',
              'financial_document_issuer_profiles',
              'financial_document_numbering_series'
            )
          order by table_name
        `);
        expect(tables.rows.map((row) => row.table_name)).toEqual([
          "financial_document_issuer_profiles",
          "financial_document_line_tax_components",
          "financial_document_lines",
          "financial_document_numbering_series",
          "financial_documents",
        ]);
      });
    });

    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0020_financial_document.sql"),
      "utf8",
    );
    expect(sqlText).toContain('"app"."financial_documents"');
    expect(sqlText).toContain("financial_documents_logical_issuance_key_uidx");
    expect(sqlText).toContain("financial_documents_credit_note_prior_check");
    expect(sqlText).toContain("TAX_INVOICE");
    expect(sqlText).not.toMatch(/TAX_RECEIPT/);
    expect(sqlText).toContain("forbid_financial_document_mutation");

    const correctionSql = readFileSync(
      path.join(
        process.cwd(),
        "drizzle/0021_financial_document_foundation_integrity.sql",
      ),
      "utf8",
    );
    expect(correctionSql).toContain("financial_documents_prior_document_identity_fk");
    expect(correctionSql).toContain("financial_documents_numbering_series_scope_fk");
    expect(correctionSql).toContain("financial_documents_issuer_profile_identity_fk");
    expect(correctionSql).toContain("forbid_financial_document_child_append");
    expect(correctionSql).toContain("forbid_referenced_issuer_profile_mutation");
    expect(correctionSql).toContain("DEFERRABLE INITIALLY DEFERRED");
  });
});

describe("IMP-028 Financial Document persistence foundation", () => {
  it("FD-P01/FD-P02 statutory type set excludes TAX_RECEIPT", () => {
    expect(() => assertFinancialDocumentStatutoryType("TAX_INVOICE")).not.toThrow();
    expect(() => assertFinancialDocumentStatutoryType("TAX_RECEIPT")).toThrow(
      /TAX_RECEIPT/,
    );
  });

  it("FD-P03 document lines seal historical description/value/tax without catalog dependency", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h, {
        description: "Historical sealed boba description",
      });
      const loaded = await reloadDocument(h, doc.id);
      expect(loaded?.lines[0]?.description).toBe("Historical sealed boba description");
      expect(loaded?.lines[0]?.taxableValuePaise).toBe(BigInt(10000));
      expect(loaded?.lines[0]?.sacCode).toBe("9983");
      expect(loaded?.lines[0]?.historicalCatalogItemId).toBe("hist-item-1");
      expect(loaded?.lines[0]?.taxComponents).toHaveLength(2);
      // No live catalog FK — opaque historical id only.
      await h.persistence.withContext(async (ctx) => {
        const fk = await ctx.db.execute(sql`
          select count(*)::int as c
          from information_schema.table_constraints
          where table_schema = 'app'
            and table_name = 'financial_document_lines'
            and constraint_type = 'FOREIGN KEY'
            and constraint_name ilike '%catalog%'
        `);
        expect(fk.rows[0]?.c).toBe(0);
      });
    });
  });

  it("FD-P04 issuer profile versioning does not rewrite sealed documents", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      expect(doc.issuerProfileVersion).toBe(1);
      expect(doc.supplierGstin).toBeNull();

      await h.persistence.transaction(async (tx) => {
        await insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 2,
          gstLegalName: "Later Profile Name",
          gstin: "27AAAAA0000A1Z5",
          stateCode: "27",
          registrationStatus: "registered",
          registrationScheme: "regular",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: h.clock.now(),
          lifecycleStatus: "draft",
          now: h.clock.now(),
        });
      });

      const reloaded = await reloadDocument(h, doc.id);
      expect(reloaded?.issuerProfileVersion).toBe(1);
      expect(reloaded?.supplierGstin).toBeNull();
      expect(reloaded?.supplierGstLegalName).toBeNull();
    });
  });

  it("FD-P05 required references use valid Checkout/Payment/Order ids", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      expect(doc.checkoutId).toBe(h.checkoutId);
      expect(doc.checkoutSnapshotId).toBe(h.checkoutSnapshotId);
      expect(doc.paymentId).toBe(h.paymentId);
      expect(doc.orderId).toBe(h.orderId);

      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            h.numberingSeriesId,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-bad-payment-${randomUUID()}`,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            paymentId: randomUUID(),
            lines: [
              {
                lineNumber: 1,
                description: "bad payment ref",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-P06/FD-P07/FD-P08/FD-P09 does not rewrite Checkout/Payment/Refund/Order", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const before = await h.persistence.withContext(async (ctx) => {
        const checkout = await ctx.db.execute(sql`
          select id, checkout_revision, grand_total_paise::text as grand_total_paise
          from app.checkout_snapshots where id = ${h.checkoutSnapshotId}::uuid
        `);
        const payment = await ctx.db.execute(sql`
          select id, status, updated_at
          from app.payments where id = ${h.paymentId}::uuid
        `);
        const order = await ctx.db.execute(sql`
          select id, status, order_number from app.orders where id = ${h.orderId}::uuid
        `);
        const refundCount = await ctx.db.execute(sql`
          select count(*)::int as c from app.refunds where payment_id = ${h.paymentId}::uuid
        `);
        return {
          checkout: checkout.rows[0],
          payment: payment.rows[0],
          order: order.rows[0],
          refundCount: refundCount.rows[0]?.c,
        };
      });

      await issueTaxInvoiceForHarness(h);

      const after = await h.persistence.withContext(async (ctx) => {
        const checkout = await ctx.db.execute(sql`
          select id, checkout_revision, grand_total_paise::text as grand_total_paise
          from app.checkout_snapshots where id = ${h.checkoutSnapshotId}::uuid
        `);
        const payment = await ctx.db.execute(sql`
          select id, status, updated_at
          from app.payments where id = ${h.paymentId}::uuid
        `);
        const order = await ctx.db.execute(sql`
          select id, status, order_number from app.orders where id = ${h.orderId}::uuid
        `);
        const refundCount = await ctx.db.execute(sql`
          select count(*)::int as c from app.refunds where payment_id = ${h.paymentId}::uuid
        `);
        const paymentStatuses = await ctx.db.execute(sql`
          select distinct status from app.payments where id = ${h.paymentId}::uuid
        `);
        return {
          checkout: checkout.rows[0],
          payment: payment.rows[0],
          order: order.rows[0],
          refundCount: refundCount.rows[0]?.c,
          paymentStatuses: paymentStatuses.rows.map((r) => r.status),
        };
      });

      expect(after.checkout).toEqual(before.checkout);
      expect(after.payment).toEqual(before.payment);
      expect(after.order).toEqual(before.order);
      expect(after.refundCount).toEqual(before.refundCount);
      expect(after.paymentStatuses).not.toContain("REFUNDED");
    });
  });

  it("FD-P10 statutory number uniqueness enforced", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const first = await issueTaxInvoiceForHarness(h);
      await expect(
        h.persistence.transaction(async (tx) =>
          insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: first.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-dup-number-${randomUUID()}`,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: first.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "dup number",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          }),
        ),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-P11 logical issuance idempotency uniqueness enforced", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const key = `fd-idem-${randomUUID()}`;
      await issueTaxInvoiceForHarness(h, { logicalIssuanceKey: key });
      await expect(
        issueTaxInvoiceForHarness(h, { logicalIssuanceKey: key }),
      ).rejects.toMatchObject({ code: "ISSUANCE_IDEMPOTENCY_CONFLICT" });
    });
  });

  it("FD-P11b genuine logical_issuance_key unique violation maps to ISSUANCE_IDEMPOTENCY_CONFLICT", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const key = `fd-idem-race-${randomUUID()}`;
      const build = async () =>
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            h.numberingSeriesId,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: key,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "race idempotency",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        });

      const results = await Promise.allSettled([build(), build()]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      const rejection = rejected[0] as PromiseRejectedResult;
      expect(rejection.reason).toBeInstanceOf(FinancialDocumentError);
      expect(rejection.reason).toMatchObject({
        code: "ISSUANCE_IDEMPOTENCY_CONFLICT",
      });
    });
  });

  it("FD-P11c CHECK violation mentioning logical_issuance_key is not remapped to ISSUANCE_IDEMPOTENCY_CONFLICT", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      let error: unknown;
      try {
        await h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            h.numberingSeriesId,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: "   ",
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "blank key check",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeTruthy();
      expect(error).not.toMatchObject({ code: "ISSUANCE_IDEMPOTENCY_CONFLICT" });
      const message =
        error instanceof Error
          ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
          : String(error);
      // CHECK failures mention logical_issuance_key in constraint/SQL text but must
      // not be classified as issuance idempotency conflicts.
      expect(message).toMatch(/logical_issuance_key/i);
      expect(message).toMatch(/check constraint|23514|nonempty/i);
      if (error instanceof FinancialDocumentError) {
        expect(error.code).not.toBe("ISSUANCE_IDEMPOTENCY_CONFLICT");
      }
    });
  });

  it("FD-P11d foreign-key violation is not remapped to ISSUANCE_IDEMPOTENCY_CONFLICT", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await expect(
        h.persistence.transaction(async (tx) =>
          insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: `TI/2526/FK-${randomUUID().slice(0, 5)}`,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-fk-${randomUUID()}`,
            numberingSeriesId: randomUUID(),
            sequenceNumber: BigInt(1),
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "bad numbering series fk",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "UPSTREAM_REFERENCE_INVALID" });
    });
  });

  it("FD-P11e non-unique constraint failure preserves non-idempotency classification", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const first = await issueTaxInvoiceForHarness(h);
      await expect(
        h.persistence.transaction(async (tx) =>
          insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: first.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-num-conflict-${randomUUID()}`,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: first.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "dup statutory number",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "STATUTORY_NUMBER_CONFLICT" });
    });
  });

  it("FD-P12 concurrent numbering allocation cannot return the same number", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const second = getApplicationPersistence(
        applicationConfig(h.connectionString),
      );
      trackPersistenceHandle(second);

      const results = await Promise.all([
        h.persistence.transaction((tx) =>
          allocateStatutoryNumber(tx, h.numberingSeriesId, h.clock.now()),
        ),
        second.transaction((tx) =>
          allocateStatutoryNumber(tx, h.numberingSeriesId, h.clock.now()),
        ),
      ]);

      expect(results[0].statutoryDocumentNumber).not.toBe(
        results[1].statutoryDocumentNumber,
      );
      expect(results[0].sequenceNumber).not.toBe(results[1].sequenceNumber);
      const sequences = new Set(
        results.map((row) => row.sequenceNumber.toString()),
      );
      expect(sequences.size).toBe(2);
    });
  });

  it("FD-P13 CREDIT_NOTE requires prior TAX_INVOICE linkage", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const invoice = await issueTaxInvoiceForHarness(h);

      const cnSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "CREDIT_NOTE",
          financialYear: h.financialYear,
          seriesCode: "CN",
          prefix: "CN/2526/",
          now: h.clock.now(),
        }),
      );

      const creditNote = await h.persistence.transaction(async (tx) => {
        const allocated = await allocateStatutoryNumber(
          tx,
          cnSeries.id,
          h.clock.now(),
        );
        return insertIssuedFinancialDocument(tx, {
          documentType: "CREDIT_NOTE",
          statutoryDocumentNumber: allocated.statutoryDocumentNumber,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-cn-${randomUUID()}`,
          numberingSeriesId: cnSeries.id,
          sequenceNumber: allocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.issuerProfileId,
          issuerProfileVersion: h.issuerProfileVersion,
          taxableTotalPaise: BigInt(1000),
          taxTotalPaise: BigInt(50),
          discountTotalPaise: BigInt(0),
          chargeTotalPaise: BigInt(0),
          grandTotalPaise: BigInt(1050),
          priorFinancialDocumentId: invoice.id,
          priorDocumentType: "TAX_INVOICE",
          lines: [
            {
              lineNumber: 1,
              description: "Credit against tax invoice",
              quantity: 1,
              unitPaise: BigInt(1000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(1000),
              lineTotalPaise: BigInt(1050),
            },
          ],
          now: h.clock.now(),
        });
      });

      expect(creditNote.priorDocumentType).toBe("TAX_INVOICE");
      expect(creditNote.priorFinancialDocumentId).toBe(invoice.id);

      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            cnSeries.id,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-cn-bad-${randomUUID()}`,
            numberingSeriesId: cnSeries.id,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            priorFinancialDocumentId: null,
            priorDocumentType: null,
            lines: [
              {
                lineNumber: 1,
                description: "missing prior",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toMatchObject({ code: "CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE" });
    });
  });

  it("FD-P14 BoS-only Credit Note is rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const bosSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "BILL_OF_SUPPLY",
          financialYear: h.financialYear,
          seriesCode: "BOS",
          prefix: "BOS/2526/",
          now: h.clock.now(),
        }),
      );

      const bos = await h.persistence.transaction(async (tx) => {
        const allocated = await allocateStatutoryNumber(
          tx,
          bosSeries.id,
          h.clock.now(),
        );
        return insertIssuedFinancialDocument(tx, {
          documentType: "BILL_OF_SUPPLY",
          statutoryDocumentNumber: allocated.statutoryDocumentNumber,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-bos-${randomUUID()}`,
          numberingSeriesId: bosSeries.id,
          sequenceNumber: allocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.issuerProfileId,
          issuerProfileVersion: h.issuerProfileVersion,
          taxableTotalPaise: BigInt(1000),
          taxTotalPaise: BigInt(0),
          discountTotalPaise: BigInt(0),
          chargeTotalPaise: BigInt(0),
          grandTotalPaise: BigInt(1000),
          lines: [
            {
              lineNumber: 1,
              description: "BoS line",
              quantity: 1,
              unitPaise: BigInt(1000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(1000),
              lineTotalPaise: BigInt(1000),
            },
          ],
          now: h.clock.now(),
        });
      });

      const cnSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "CREDIT_NOTE",
          financialYear: h.financialYear,
          seriesCode: "CN2",
          prefix: "CN2/2526/",
          now: h.clock.now(),
        }),
      );

      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            cnSeries.id,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-cn-bos-${randomUUID()}`,
            numberingSeriesId: cnSeries.id,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            priorFinancialDocumentId: bos.id,
            priorDocumentType: "BILL_OF_SUPPLY",
            lines: [
              {
                lineNumber: 1,
                description: "illegal bos credit",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toMatchObject({
        code: "BILL_OF_SUPPLY_CREDIT_NOTE_PROHIBITED",
      });
    });
  });

  it("FD-P15 incomplete issuer profiles do not receive fake GST defaults", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const profile = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select gst_legal_name, gstin, state_code, registration_scheme,
                 default_sac_code, default_hsn_code, default_tax_rate_bps,
                 issuance_policy, dynamic_qr_applicable
          from app.financial_document_issuer_profiles
          where id = ${h.issuerProfileId}::uuid
        `);
        return rows.rows[0];
      });
      expect(profile?.gst_legal_name).toBeNull();
      expect(profile?.gstin).toBeNull();
      expect(profile?.state_code).toBeNull();
      expect(profile?.registration_scheme).toBeNull();
      expect(profile?.default_sac_code).toBeNull();
      expect(profile?.default_hsn_code).toBeNull();
      expect(profile?.default_tax_rate_bps).toBeNull();
      expect(profile?.issuance_policy).toBeNull();
      expect(profile?.dynamic_qr_applicable).toBeNull();
    });
  });

  it("FD-P16 bigint paise monetary semantics retained", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      expect(typeof doc.grandTotalPaise).toBe("bigint");
      expect(doc.grandTotalPaise).toBe(BigInt(10500));
      expect(doc.lines[0]?.unitPaise).toBe(BigInt(10000));
      await expect(updateIssuedFinancialDocument()).rejects.toMatchObject({
        code: "IMMUTABLE_DOCUMENT_MUTATION_FORBIDDEN",
      });

      await h.persistence.withContext(async (ctx) => {
        let updateError: unknown = null;
        try {
          await ctx.db.execute(sql`
            update app.financial_documents
            set grand_total_paise = 1
            where id = ${doc.id}::uuid
          `);
        } catch (error) {
          updateError = error;
        }
        expect(updateError).toBeTruthy();
        const message =
          updateError instanceof Error
            ? `${updateError.message}\n${String((updateError as { cause?: unknown }).cause ?? "")}`
            : String(updateError);
        expect(message).toMatch(
          /immutable|forbid_financial_document_mutation|ARCH-G16|permission denied|must be owner/i,
        );
      });
    });
  });

  it("loads issued Financial Document by id with sealed snapshot", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const loaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, doc.id),
      );
      expect(loaded?.status).toBe("ISSUED");
      expect(loaded?.documentType).toBe("TAX_INVOICE");
      expect(loaded?.currency).toBe("INR");
      expect(loaded?.statutoryDocumentNumber.startsWith("ORD-")).toBe(false);
    });
  });
});

function postgresErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`;
}

describe("IMP-028 Financial Document foundation corrections (FD-C01..FD-C13)", () => {
  it("FD-C01 rejects post-issuance line append", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await h.persistence.withContext(async (ctx) => {
        let appendError: unknown = null;
        try {
          await ctx.db.execute(sql`
            insert into app.financial_document_lines (
              id, financial_document_id, line_number, description, quantity,
              unit_paise, discount_paise, charge_paise, taxable_value_paise, line_total_paise
            ) values (
              ${randomUUID()}::uuid, ${doc.id}::uuid, 2, 'illegal append', 1,
              100, 0, 0, 100, 100
            )
          `);
        } catch (error) {
          appendError = error;
        }
        expect(appendError).toBeTruthy();
        expect(postgresErrorText(appendError)).toMatch(
          /append-closed|ARCH-G16|forbid_financial_document_child_append/i,
        );
      });
    });
  });

  it("FD-C02 rejects post-issuance tax-component append", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const lineId = doc.lines[0]!.id;
      await h.persistence.withContext(async (ctx) => {
        let appendError: unknown = null;
        try {
          await ctx.db.execute(sql`
            insert into app.financial_document_line_tax_components (
              id, financial_document_line_id, tax_type, rate_bps,
              taxable_amount_paise, tax_amount_paise
            ) values (
              ${randomUUID()}::uuid, ${lineId}::uuid, 'igst', 500,
              10000, 500
            )
          `);
        } catch (error) {
          appendError = error;
        }
        expect(appendError).toBeTruthy();
        expect(postgresErrorText(appendError)).toMatch(
          /append-closed|ARCH-G16|forbid_financial_document_child_append/i,
        );
      });
    });
  });

  it("FD-C03 atomically creates complete multi-line aggregate", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await h.persistence.transaction(async (tx) => {
        const allocated = await allocateStatutoryNumber(
          tx,
          h.numberingSeriesId,
          h.clock.now(),
        );
        return insertIssuedFinancialDocument(tx, {
          documentType: "TAX_INVOICE",
          statutoryDocumentNumber: allocated.statutoryDocumentNumber,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-c03-${randomUUID()}`,
          numberingSeriesId: h.numberingSeriesId,
          sequenceNumber: allocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.issuerProfileId,
          issuerProfileVersion: h.issuerProfileVersion,
          taxableTotalPaise: BigInt(20000),
          taxTotalPaise: BigInt(1000),
          discountTotalPaise: BigInt(0),
          chargeTotalPaise: BigInt(0),
          grandTotalPaise: BigInt(21000),
          checkoutId: h.checkoutId,
          checkoutSnapshotId: h.checkoutSnapshotId,
          paymentId: h.paymentId,
          orderId: h.orderId,
          lines: [
            {
              lineNumber: 1,
              description: "Line A",
              quantity: 1,
              unitPaise: BigInt(10000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(10000),
              lineTotalPaise: BigInt(10500),
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: BigInt(10000),
                  taxAmountPaise: BigInt(250),
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: BigInt(10000),
                  taxAmountPaise: BigInt(250),
                },
              ],
            },
            {
              lineNumber: 2,
              description: "Line B",
              quantity: 1,
              unitPaise: BigInt(10000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(10000),
              lineTotalPaise: BigInt(10500),
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: BigInt(10000),
                  taxAmountPaise: BigInt(250),
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: BigInt(10000),
                  taxAmountPaise: BigInt(250),
                },
              ],
            },
          ],
          now: h.clock.now(),
        });
      });

      expect(doc.status).toBe("ISSUED");
      expect(doc.lines).toHaveLength(2);
      expect(doc.lines[0]?.taxComponents).toHaveLength(2);
      expect(doc.lines[1]?.taxComponents).toHaveLength(2);

      const orphanLines = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_document_lines l
          left join app.financial_documents d on d.id = l.financial_document_id
          where d.id is null
        `);
        return rows.rows[0]?.c;
      });
      expect(orphanLines).toBe(0);
    });
  });

  it("FD-C04 raw SQL rejects CREDIT_NOTE prior-type lie against Bill of Supply", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const bosSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "BILL_OF_SUPPLY",
          financialYear: h.financialYear,
          seriesCode: "BOS-C04",
          prefix: "B4/2526/",
          now: h.clock.now(),
        }),
      );
      const bos = await h.persistence.transaction(async (tx) => {
        const allocated = await allocateStatutoryNumber(
          tx,
          bosSeries.id,
          h.clock.now(),
        );
        return insertIssuedFinancialDocument(tx, {
          documentType: "BILL_OF_SUPPLY",
          statutoryDocumentNumber: allocated.statutoryDocumentNumber,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-c04-bos-${randomUUID()}`,
          numberingSeriesId: bosSeries.id,
          sequenceNumber: allocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.issuerProfileId,
          issuerProfileVersion: h.issuerProfileVersion,
          taxableTotalPaise: BigInt(1000),
          taxTotalPaise: BigInt(0),
          discountTotalPaise: BigInt(0),
          chargeTotalPaise: BigInt(0),
          grandTotalPaise: BigInt(1000),
          lines: [
            {
              lineNumber: 1,
              description: "BoS",
              quantity: 1,
              unitPaise: BigInt(1000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(1000),
              lineTotalPaise: BigInt(1000),
            },
          ],
          now: h.clock.now(),
        });
      });

      const cnSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "CREDIT_NOTE",
          financialYear: h.financialYear,
          seriesCode: "CN-C04",
          prefix: "C4/2526/",
          now: h.clock.now(),
        }),
      );

      await h.persistence.withContext(async (ctx) => {
        let lieError: unknown = null;
        try {
          await ctx.db.execute(sql`
            insert into app.financial_documents (
              id, document_type, status, statutory_document_number, issue_at,
              financial_year, currency, logical_issuance_key, numbering_series_id,
              sequence_number, legal_entity_id, issuer_profile_id, issuer_profile_version,
              taxable_total_paise, tax_total_paise, discount_total_paise,
              charge_total_paise, grand_total_paise,
              prior_financial_document_id, prior_document_type, created_at
            ) values (
              ${randomUUID()}::uuid, 'CREDIT_NOTE', 'ISSUED', 'C4/2526/LIE001',
              ${h.clock.now()}, ${h.financialYear}, 'INR', ${`fd-c04-lie-${randomUUID()}`},
              ${cnSeries.id}::uuid, 1, ${h.legalEntityId}::uuid,
              ${h.issuerProfileId}::uuid, ${h.issuerProfileVersion},
              100, 0, 0, 0, 100,
              ${bos.id}::uuid, 'TAX_INVOICE', ${h.clock.now()}
            )
          `);
        } catch (error) {
          lieError = error;
        }
        expect(lieError).toBeTruthy();
        expect(postgresErrorText(lieError)).toMatch(
          /foreign key|prior_document_identity|violates/i,
        );
      });
    });
  });

  it("FD-C05 allows valid Tax Invoice → Credit Note", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const invoice = await issueTaxInvoiceForHarness(h);
      const cnSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "CREDIT_NOTE",
          financialYear: h.financialYear,
          seriesCode: "CN-C05",
          prefix: "C5/2526/",
          now: h.clock.now(),
        }),
      );
      const creditNote = await h.persistence.transaction(async (tx) => {
        const allocated = await allocateStatutoryNumber(
          tx,
          cnSeries.id,
          h.clock.now(),
        );
        return insertIssuedFinancialDocument(tx, {
          documentType: "CREDIT_NOTE",
          statutoryDocumentNumber: allocated.statutoryDocumentNumber,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-c05-${randomUUID()}`,
          numberingSeriesId: cnSeries.id,
          sequenceNumber: allocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.issuerProfileId,
          issuerProfileVersion: h.issuerProfileVersion,
          taxableTotalPaise: BigInt(1000),
          taxTotalPaise: BigInt(50),
          discountTotalPaise: BigInt(0),
          chargeTotalPaise: BigInt(0),
          grandTotalPaise: BigInt(1050),
          priorFinancialDocumentId: invoice.id,
          priorDocumentType: "TAX_INVOICE",
          lines: [
            {
              lineNumber: 1,
              description: "Valid credit",
              quantity: 1,
              unitPaise: BigInt(1000),
              discountPaise: BigInt(0),
              chargePaise: BigInt(0),
              taxableValuePaise: BigInt(1000),
              lineTotalPaise: BigInt(1050),
            },
          ],
          now: h.clock.now(),
        });
      });
      expect(creditNote.priorFinancialDocumentId).toBe(invoice.id);
      expect(creditNote.priorDocumentType).toBe("TAX_INVOICE");
    });
  });

  it("FD-C06 rejects numbering-series legal-entity mismatch", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const foreignSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.tree.leB.id,
          documentType: "TAX_INVOICE",
          financialYear: h.financialYear,
          seriesCode: "TI-B",
          prefix: "TIB/2526/",
          now: h.clock.now(),
        }),
      );
      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            foreignSeries.id,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-c06-${randomUUID()}`,
            numberingSeriesId: foreignSeries.id,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "entity mismatch",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-C07 rejects numbering-series document-type mismatch", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const cnSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "CREDIT_NOTE",
          financialYear: h.financialYear,
          seriesCode: "CN-C07",
          prefix: "C7/2526/",
          now: h.clock.now(),
        }),
      );
      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            cnSeries.id,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-c07-${randomUUID()}`,
            numberingSeriesId: cnSeries.id,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "type mismatch",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-C08 rejects numbering-series FY mismatch", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const otherFySeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.legalEntityId,
          documentType: "TAX_INVOICE",
          financialYear: "2024-25",
          seriesCode: "TI-FY",
          prefix: "TI/2425/",
          now: h.clock.now(),
        }),
      );
      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            otherFySeries.id,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-c08-${randomUUID()}`,
            numberingSeriesId: otherFySeries.id,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: h.issuerProfileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "fy mismatch",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-C09 rejects issuer-profile legal-entity mismatch", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const foreignProfile = await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.tree.orgB.id,
          legalEntityId: h.tree.leB.id,
          profileVersion: 1,
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: h.clock.now(),
          lifecycleStatus: "draft",
          now: h.clock.now(),
        }),
      );
      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            h.numberingSeriesId,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-c09-${randomUUID()}`,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: foreignProfile.id,
            issuerProfileVersion: foreignProfile.profileVersion,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "profile entity mismatch",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-C10 rejects issuer-profile version lie", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await expect(
        h.persistence.transaction(async (tx) => {
          const allocated = await allocateStatutoryNumber(
            tx,
            h.numberingSeriesId,
            h.clock.now(),
          );
          return insertIssuedFinancialDocument(tx, {
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: allocated.statutoryDocumentNumber,
            issueAt: h.clock.now(),
            financialYear: h.financialYear,
            logicalIssuanceKey: `fd-c10-${randomUUID()}`,
            numberingSeriesId: h.numberingSeriesId,
            sequenceNumber: allocated.sequenceNumber,
            legalEntityId: h.legalEntityId,
            issuerProfileId: h.issuerProfileId,
            issuerProfileVersion: 999,
            taxableTotalPaise: BigInt(100),
            taxTotalPaise: BigInt(0),
            discountTotalPaise: BigInt(0),
            chargeTotalPaise: BigInt(0),
            grandTotalPaise: BigInt(100),
            lines: [
              {
                lineNumber: 1,
                description: "version lie",
                quantity: 1,
                unitPaise: BigInt(100),
                discountPaise: BigInt(0),
                chargePaise: BigInt(0),
                taxableValuePaise: BigInt(100),
                lineTotalPaise: BigInt(100),
              },
            ],
            now: h.clock.now(),
          });
        }),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-C11 rejects material UPDATE of referenced issuer profile", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await issueTaxInvoiceForHarness(h);
      await h.persistence.withContext(async (ctx) => {
        let updateError: unknown = null;
        try {
          await ctx.db.execute(sql`
            update app.financial_document_issuer_profiles
            set registration_status = 'registered',
                updated_at = ${h.clock.now()}
            where id = ${h.issuerProfileId}::uuid
          `);
        } catch (error) {
          updateError = error;
        }
        expect(updateError).toBeTruthy();
        expect(postgresErrorText(updateError)).toMatch(
          /immutable|referenced by issued|ARCH-G16|forbid_referenced_issuer_profile/i,
        );
      });
    });
  });

  it("FD-C12 rejects DELETE of referenced issuer profile", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await issueTaxInvoiceForHarness(h);
      await h.persistence.withContext(async (ctx) => {
        let deleteError: unknown = null;
        try {
          await ctx.db.execute(sql`
            delete from app.financial_document_issuer_profiles
            where id = ${h.issuerProfileId}::uuid
          `);
        } catch (error) {
          deleteError = error;
        }
        expect(deleteError).toBeTruthy();
        expect(postgresErrorText(deleteError)).toMatch(
          /immutable|referenced by issued|ARCH-G16|foreign key|restrict|forbid_referenced_issuer_profile/i,
        );
      });
    });
  });

  it("FD-C13 allows new issuer profile version after prior is referenced", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await issueTaxInvoiceForHarness(h);
      const next = await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 2,
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          enableCreditNote: true,
          validFrom: h.clock.now(),
          lifecycleStatus: "draft",
          now: h.clock.now(),
        }),
      );
      expect(next.profileVersion).toBe(2);
      expect(next.id).not.toBe(h.issuerProfileId);
    });
  });
});
