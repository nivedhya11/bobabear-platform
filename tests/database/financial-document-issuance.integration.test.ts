/**
 * IMP-028 Slice 2 — Atomic Financial Document issuance operation tests (FD-I01..FD-I18).
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  issueFinancialDocument,
  insertIssuerProfile,
  insertNumberingSeries,
  loadFinancialDocument,
} from "../../src/server/financial-document";
import { requestRefund } from "../../src/server/refund";
import {
  FinancialDocumentError,
  sealIssuanceArithmetic,
} from "../../src/shared/financial-document";
import { withCompletedPositiveOrderHarness } from "./support/order-fixtures";
import {
  buildIssueCommand,
  closeTrackedPersistenceHandles,
  standardTaxInvoiceLines,
  withFinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

describe("IMP-028 Financial Document issuance operation (FD-I01..FD-I18)", () => {
  it("FD-I01 first issuance creates one document and one number", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return BigInt(String(rows.rows[0]?.n));
      });

      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      expect(doc.status).toBe("ISSUED");
      expect(doc.documentType).toBe("TAX_INVOICE");
      expect(doc.sequenceNumber).toBe(before);
      expect(doc.statutoryDocumentNumber).toBe(
        `TI/2526/${before.toString().padStart(6, "0")}`,
      );
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
      expect(doc.lines).toHaveLength(1);
      expect(doc.grandTotalPaise).toBe(10500n);

      const after = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return BigInt(String(rows.rows[0]?.n));
      });
      expect(after).toBe(before + 1n);
    });
  });

  it("FD-I02 exact retry returns the same document and number", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-i02-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const first = await issueFinancialDocument(h.persistence, command);
      const second = await issueFinancialDocument(h.persistence, command);
      expect(second.id).toBe(first.id);
      expect(second.statutoryDocumentNumber).toBe(first.statutoryDocumentNumber);
      expect(second.sequenceNumber).toBe(first.sequenceNumber);

      const count = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_documents
          where logical_issuance_key = ${key}
        `);
        return rows.rows[0]?.c;
      });
      expect(count).toBe(1);
    });
  });

  it("FD-I03 conflicting idempotency reuse is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-i03-${randomUUID()}`;
      await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: key }),
      );
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: key,
            lines: [
              {
                ...standardTaxInvoiceLines()[0]!,
                description: "Different immutable intent",
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({
        code: "ISSUANCE_IDEMPOTENCY_CONFLICT",
      });
    });
  });

  it("FD-I04 concurrent equivalent issuance resolves to one document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-i04-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const [a, b] = await Promise.all([
        issueFinancialDocument(h.persistence, command),
        issueFinancialDocument(h.persistence, command),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.statutoryDocumentNumber).toBe(b.statutoryDocumentNumber);

      const stats = await h.persistence.withContext(async (ctx) => {
        const docs = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_documents
          where logical_issuance_key = ${key}
        `);
        const series = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return {
          docCount: docs.rows[0]?.c,
          nextSequence: BigInt(String(series.rows[0]?.n)),
        };
      });
      expect(stats.docCount).toBe(1);
      expect(stats.nextSequence).toBe(a.sequenceNumber + 1n);
    });
  });

  it("FD-I05 number/document rollback leaves no orphans and restores sequence", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return BigInt(String(rows.rows[0]?.n));
      });

      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h), {
          afterNumberAllocated: () => {
            throw new Error("forced issuance failure after allocate");
          },
        }),
      ).rejects.toThrow(/forced issuance failure/);

      const mid = await h.persistence.withContext(async (ctx) => {
        const series = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        const docs = await ctx.db.execute(sql`
          select count(*)::int as c from app.financial_documents
          where numbering_series_id = ${h.numberingSeriesId}::uuid
        `);
        const orphans = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_document_lines l
          left join app.financial_documents d on d.id = l.financial_document_id
          where d.id is null
        `);
        return {
          nextSequence: BigInt(String(series.rows[0]?.n)),
          docCount: docs.rows[0]?.c,
          orphanLines: orphans.rows[0]?.c,
        };
      });
      expect(mid.nextSequence).toBe(before);
      expect(mid.docCount).toBe(0);
      expect(mid.orphanLines).toBe(0);

      const success = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h),
      );
      expect(success.sequenceNumber).toBe(before);
    });
  });

  it("FD-I06 effective profile missing fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const now = h.clock.now();
      const foreignSeries = await h.persistence.transaction(async (tx) =>
        insertNumberingSeries(tx, {
          legalEntityId: h.tree.leB.id,
          documentType: "TAX_INVOICE",
          financialYear: h.financialYear,
          seriesCode: "TI-B",
          prefix: "TIB/2526/",
          now,
        }),
      );
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            legalEntityId: h.tree.leB.id,
            numberingSeriesId: foreignSeries.id,
            checkoutId: null,
            checkoutSnapshotId: null,
            paymentId: null,
            orderId: null,
          }),
        ),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_NOT_FOUND" });
    });
  });

  it("FD-I07 effective profile ambiguous fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const now = h.clock.now();
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Ambiguous Other",
          gstin: "27BBBBB0000B1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "99 Other Street",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: now,
          lifecycleStatus: "active",
          now,
        }),
      );
      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h)),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_AMBIGUOUS" });
    });
  });

  it("FD-I08 document type disabled fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const now = h.clock.now();
      // Make the existing active profile no longer eligible; insert active without tax invoice.
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_issuer_profiles
          set lifecycle_status = 'retired',
              retired_at = ${now},
              updated_at = ${now}
          where id = ${h.activeIssuerProfileId}::uuid
        `);
      });
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "No Tax Invoice",
          gstin: "27CCCCC0000C1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "1 Lane",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: false,
          enableBillOfSupply: true,
          validFrom: now,
          lifecycleStatus: "active",
          now,
        }),
      );
      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h)),
      ).rejects.toMatchObject({ code: "DOCUMENT_TYPE_DISABLED" });
    });
  });

  it("FD-I09 incomplete required configuration fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const now = h.clock.now();
      await h.persistence.withContext(async (ctx) => {
        await ctx.db.execute(sql`
          update app.financial_document_issuer_profiles
          set lifecycle_status = 'retired',
              retired_at = ${now},
              updated_at = ${now}
          where id = ${h.activeIssuerProfileId}::uuid
        `);
      });
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          registrationStatus: "registered",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          // Missing GSTIN / legal name / address on purpose.
          validFrom: now,
          lifecycleStatus: "active",
          now,
        }),
      );
      await expect(
        issueFinancialDocument(h.persistence, buildIssueCommand(h)),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_INCOMPLETE" });
    });
  });

  it("FD-I10 unrelated Payment is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await withCompletedPositiveOrderHarness(async (other) => {
        await expect(
          issueFinancialDocument(
            h.persistence,
            buildIssueCommand(h, {
              paymentId: other.paymentId,
            }),
          ),
        ).rejects.toMatchObject({ code: "UPSTREAM_REFERENCE_INVALID" });
      });
    });
  });

  it("FD-I11 unrelated Order is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await withCompletedPositiveOrderHarness(async (other) => {
        await expect(
          issueFinancialDocument(
            h.persistence,
            buildIssueCommand(h, {
              orderId: other.order.id,
            }),
          ),
        ).rejects.toMatchObject({ code: "UPSTREAM_REFERENCE_INVALID" });
      });
    });
  });

  it("FD-I12 unrelated Refund is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { withRefundReadyHarness } = await import(
        "./support/refund-fixtures"
      );
      await withRefundReadyHarness(async (other) => {
        const result = await requestRefund(
          other.persistence,
          other.workforce.support,
          {
            paymentId: other.paymentId,
            amountPaise: 100n,
            reason: "unrelated refund",
          },
          { provider: other.provider },
        );
        await expect(
          issueFinancialDocument(
            h.persistence,
            buildIssueCommand(h, {
              documentType: "REFUND_VOUCHER",
              numberingSeriesId: h.refundVoucherSeriesId,
              refundId: result.refund.id,
              paymentId: h.paymentId,
            }),
          ),
        ).rejects.toMatchObject({ code: "UPSTREAM_REFERENCE_INVALID" });
      });
    });
  });

  it("FD-I13 Section 34 valid Tax Invoice → Credit Note", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          priorFinancialDocumentId: invoice.id,
          lines: [
            {
              lineNumber: 1,
              description: "Credit",
              quantity: 1,
              unitPaise: 1000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 1000n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: 1000n,
                  taxAmountPaise: 25n,
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: 1000n,
                  taxAmountPaise: 25n,
                },
              ],
            },
          ],
        }),
      );
      expect(creditNote.priorFinancialDocumentId).toBe(invoice.id);
      expect(creditNote.priorDocumentType).toBe("TAX_INVOICE");
    });
  });

  it("FD-I14 Section 34 invalid BoS prior is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const bos = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "BILL_OF_SUPPLY",
          lines: [
            {
              lineNumber: 1,
              description: "BoS",
              quantity: 1,
              unitPaise: 1000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 1000n,
              sacCode: "9983",
              taxComponents: [],
            },
          ],
        }),
      );
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            documentType: "CREDIT_NOTE",
            priorFinancialDocumentId: bos.id,
          }),
        ),
      ).rejects.toBeInstanceOf(FinancialDocumentError);
    });
  });

  it("FD-I15 arithmetic mismatch is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            grandTotalPaise: 1n,
          }),
        ),
      ).rejects.toMatchObject({ code: "ARITHMETIC_INVALID" });

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            lines: [
              {
                ...standardTaxInvoiceLines()[0]!,
                taxableValuePaise: 9999n,
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "ARITHMETIC_INVALID" });
    });
  });

  it("FD-I16 tax-component mismatch is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            lines: [
              {
                ...standardTaxInvoiceLines()[0]!,
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

  it("FD-I17 post-return aggregate remains immutable", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h),
      );
      await h.persistence.withContext(async (ctx) => {
        let appendError: unknown = null;
        try {
          await ctx.db.execute(sql`
            insert into app.financial_document_lines (
              id, financial_document_id, line_number, description, quantity,
              unit_paise, discount_paise, charge_paise, taxable_value_paise, line_total_paise
            ) values (
              ${randomUUID()}::uuid, ${doc.id}::uuid, 2, 'illegal', 1,
              100, 0, 0, 100, 100
            )
          `);
        } catch (error) {
          appendError = error;
        }
        expect(appendError).toBeTruthy();

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
      });
    });
  });

  it("FD-I18 referenced profile remains frozen after issuance", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h),
      );
      await h.persistence.withContext(async (ctx) => {
        let updateError: unknown = null;
        try {
          await ctx.db.execute(sql`
            update app.financial_document_issuer_profiles
            set registration_status = 'unregistered',
                updated_at = ${h.clock.now()}
            where id = ${h.activeIssuerProfileId}::uuid
          `);
        } catch (error) {
          updateError = error;
        }
        expect(updateError).toBeTruthy();
        const message =
          updateError instanceof Error
            ? `${updateError.message}\n${String((updateError as { cause?: unknown }).cause ?? "")}`
            : String(updateError);
        expect(message).toMatch(/immutable|referenced by issued|ARCH-G16/i);
      });

      const loaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, doc.id),
      );
      expect(loaded?.issuerProfileId).toBe(h.activeIssuerProfileId);
    });
  });
});

describe("IMP-028 issuance arithmetic unit", () => {
  it("derives header totals from sealed lines", () => {
    const sealed = sealIssuanceArithmetic(standardTaxInvoiceLines());
    expect(sealed.taxableTotalPaise).toBe(10000n);
    expect(sealed.taxTotalPaise).toBe(500n);
    expect(sealed.grandTotalPaise).toBe(10500n);
    expect(sealed.lines[0]?.lineTotalPaise).toBe(10500n);
  });

  it("FD-IC05 tax amount mathematically derived via taxExclusivePaise", async () => {
    const { taxExclusivePaise } = await import("../../src/shared/pricing/money");
    const taxable = 333n;
    const rateBps = 250;
    const expected = taxExclusivePaise(taxable, rateBps);
    expect(expected).toBe(8n);
    const sealed = sealIssuanceArithmetic([
      {
        lineNumber: 1,
        description: "rounding",
        quantity: 1,
        unitPaise: taxable,
        discountPaise: 0n,
        chargePaise: 0n,
        taxableValuePaise: taxable,
        sacCode: "9983",
        taxComponents: [
          {
            taxType: "cgst",
            rateBps,
            taxableAmountPaise: taxable,
          },
          {
            taxType: "sgst",
            rateBps,
            taxableAmountPaise: taxable,
          },
        ],
      },
    ]);
    expect(sealed.lines[0]?.taxComponents[0]?.taxAmountPaise).toBe(expected);
    expect(sealed.lines[0]?.taxComponents[1]?.taxAmountPaise).toBe(expected);
    expect(sealed.taxTotalPaise).toBe(expected * 2n);
  });

  it("FD-IC06 inconsistent caller tax amount is rejected", () => {
    expect(() =>
      sealIssuanceArithmetic([
        {
          lineNumber: 1,
          description: "bad tax",
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
              taxAmountPaise: 1n,
            },
            {
              taxType: "sgst",
              rateBps: 250,
              taxableAmountPaise: 10000n,
              taxAmountPaise: 250n,
            },
          ],
        },
      ]),
    ).toThrow(/canonical exclusive GST/i);
  });
});

describe("IMP-028 Slice 2 corrections (FD-IC01..FD-IC11)", () => {
  it("FD-IC01 retry after newer profile version returns historical document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-ic01-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const first = await issueFinancialDocument(h.persistence, command);
      const beforeSeq = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return BigInt(String(rows.rows[0]?.n));
      });

      const now = h.clock.now();
      // Referenced v2 cannot be mutated; add a legitimate newer version afterward.
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Newer Profile LLP",
          gstin: "27NEWER0000N1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "99 New Street",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          enableCreditNote: true,
          enableBillOfSupply: true,
          enableReceiptVoucher: true,
          enableRefundVoucher: true,
          validFrom: now,
          lifecycleStatus: "active",
          now,
        }),
      );

      const retry = await issueFinancialDocument(h.persistence, command);
      expect(retry.id).toBe(first.id);
      expect(retry.statutoryDocumentNumber).toBe(first.statutoryDocumentNumber);
      expect(retry.issuerProfileId).toBe(first.issuerProfileId);
      expect(retry.issuerProfileVersion).toBe(first.issuerProfileVersion);

      const stats = await h.persistence.withContext(async (ctx) => {
        const docs = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_documents
          where logical_issuance_key = ${key}
        `);
        const series = await ctx.db.execute(sql`
          select next_sequence::text as n
          from app.financial_document_numbering_series
          where id = ${h.numberingSeriesId}::uuid
        `);
        return {
          docCount: docs.rows[0]?.c,
          nextSequence: BigInt(String(series.rows[0]?.n)),
        };
      });
      expect(stats.docCount).toBe(1);
      expect(stats.nextSequence).toBe(beforeSeq);
    });
  });

  it("FD-IC02 retry despite later overlapping eligible profile returns historical document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-ic02-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const first = await issueFinancialDocument(h.persistence, command);

      const now = h.clock.now();
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Overlapping Ambiguous",
          gstin: "27OVERL0000O1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "1 Overlap Lane",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: first.issueAt,
          lifecycleStatus: "active",
          now,
        }),
      );

      // Current resolution for the historical issueAt would be ambiguous.
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, { logicalIssuanceKey: `fd-ic02-new-${randomUUID()}` }),
        ),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_AMBIGUOUS" });

      const retry = await issueFinancialDocument(h.persistence, command);
      expect(retry.id).toBe(first.id);
      expect(retry.statutoryDocumentNumber).toBe(first.statutoryDocumentNumber);
    });
  });

  it("FD-IC03 conflicting retry after configuration drift is rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-ic03-${randomUUID()}`;
      await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: key }),
      );

      const now = h.clock.now();
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Drift Profile",
          gstin: "27DRIFT0000D1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "2 Drift Road",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: new Date(now.getTime() + 60_000),
          lifecycleStatus: "active",
          now,
        }),
      );

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: key,
            lines: [
              {
                ...standardTaxInvoiceLines()[0]!,
                description: "Conflicting immutable request after drift",
              },
            ],
          }),
        ),
      ).rejects.toMatchObject({ code: "ISSUANCE_IDEMPOTENCY_CONFLICT" });
    });
  });

  it("FD-IC04 profile mutation race serializes with locked profile facts", async () => {
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

      const updatePromise = h.persistence.withContext(async (ctx) => {
        try {
          await ctx.db.execute(sql`
            update app.financial_document_issuer_profiles
            set gstin = '27MUTATE0000M1Z5',
                updated_at = ${h.clock.now()}
            where id = ${h.activeIssuerProfileId}::uuid
          `);
          return { ok: true as const };
        } catch (error) {
          const message =
            error instanceof Error
              ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
              : String(error);
          return { ok: false as const, message };
        }
      });

      // Allow the UPDATE to block on the FOR SHARE lock before commit.
      await new Promise((r) => setTimeout(r, 250));
      releaseHold();

      const doc = await issuePromise;
      const updateResult = await updatePromise;

      expect(doc.supplierGstin).toBe("27AAAAA0000A1Z5");
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
      expect(updateResult.ok).toBe(false);
      expect(updateResult.message).toMatch(/immutable|referenced by issued|ARCH-G16/i);

      const profile = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select gstin
          from app.financial_document_issuer_profiles
          where id = ${h.activeIssuerProfileId}::uuid
        `);
        return String(rows.rows[0]?.gstin ?? "");
      });
      expect(profile).toBe(doc.supplierGstin);
    });
  });

  it("FD-IC07 persisted rate and amount are canonically coherent", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const { taxExclusivePaise } = await import("../../src/shared/pricing/money");
      const taxable = 10000n;
      const rateBps = 250;
      const expected = taxExclusivePaise(taxable, rateBps);
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          lines: [
            {
              lineNumber: 1,
              description: "coherent",
              quantity: 1,
              unitPaise: taxable,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: taxable,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps,
                  taxableAmountPaise: taxable,
                  // omit amount — derive
                },
                {
                  taxType: "sgst",
                  rateBps,
                  taxableAmountPaise: taxable,
                  taxAmountPaise: expected,
                },
              ],
            },
          ],
        }),
      );
      const loaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, doc.id),
      );
      expect(loaded).toBeTruthy();
      for (const line of loaded!.lines) {
        for (const tax of line.taxComponents) {
          expect(tax.taxAmountPaise).toBe(
            taxExclusivePaise(tax.taxableAmountPaise, tax.rateBps),
          );
        }
      }
    });
  });

  it("FD-IC08 overlapping profile INSERT race cannot commit before issuance", async () => {
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

      let insertSettled = false;
      const insertPromise = h.persistence
        .transaction(async (tx) =>
          insertIssuerProfile(tx, {
            brandId: h.brandId,
            organizationId: h.organizationId,
            legalEntityId: h.legalEntityId,
            profileVersion: 3,
            gstLegalName: "Phantom Insert LLP",
            gstin: "27PHANT0000P1Z5",
            stateCode: "27",
            registrationScheme: "regular",
            registrationStatus: "registered",
            registeredAddressLine1: "1 Phantom Way",
            defaultSacCode: "9983",
            reverseChargeApplicable: false,
            enableTaxInvoice: true,
            validFrom: h.clock.now(),
            lifecycleStatus: "active",
            now: h.clock.now(),
          }),
        )
        .then(
          (row) => {
            insertSettled = true;
            return { ok: true as const, id: row.id };
          },
          (error: unknown) => {
            insertSettled = true;
            return { ok: false as const, error };
          },
        );

      await new Promise((r) => setTimeout(r, 400));
      expect(insertSettled).toBe(false);

      releaseHold();
      const doc = await issuePromise;
      expect(insertSettled).toBe(false);
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
      expect(doc.supplierGstin).toBe("27AAAAA0000A1Z5");

      const insertResult = await insertPromise;
      expect(insertResult.ok).toBe(true);
      expect(insertSettled).toBe(true);
    });
  });

  it("FD-IC09 existing draft→active eligibility race waits for issuance", async () => {
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

      let updateSettled = false;
      const updatePromise = h.persistence
        .withContext(async (ctx) => {
          await ctx.db.execute(sql`
            update app.financial_document_issuer_profiles
            set lifecycle_status = 'active',
                gst_legal_name = 'Activated Draft LLP',
                gstin = '27DRAFT0000D1Z5',
                state_code = '27',
                registration_scheme = 'regular',
                registration_status = 'registered',
                registered_address_line1 = '2 Draft Lane',
                default_sac_code = '9983',
                enable_tax_invoice = true,
                valid_from = ${h.clock.now()},
                valid_to = null,
                retired_at = null,
                updated_at = ${h.clock.now()}
            where id = ${h.issuerProfileId}::uuid
          `);
        })
        .then(
          () => {
            updateSettled = true;
            return { ok: true as const };
          },
          (error: unknown) => {
            updateSettled = true;
            const message =
              error instanceof Error
                ? `${error.message}\n${String((error as { cause?: unknown }).cause ?? "")}`
                : String(error);
            return { ok: false as const, message };
          },
        );

      await new Promise((r) => setTimeout(r, 400));
      expect(updateSettled).toBe(false);

      releaseHold();
      const doc = await issuePromise;
      expect(updateSettled).toBe(false);
      expect(doc.issuerProfileId).toBe(h.activeIssuerProfileId);
      expect(doc.supplierGstin).toBe("27AAAAA0000A1Z5");

      const updateResult = await updatePromise;
      expect(updateResult.ok).toBe(true);
      expect(updateSettled).toBe(true);

      const draftStatus = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select lifecycle_status
          from app.financial_document_issuer_profiles
          where id = ${h.issuerProfileId}::uuid
        `);
        return String(rows.rows[0]?.lifecycle_status ?? "");
      });
      expect(draftStatus).toBe("active");
    });
  });

  it("FD-IC10 subsequent issuance sees post-commit profile ambiguity", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const first = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ic10-first-${randomUUID()}` }),
      );
      expect(first.issuerProfileId).toBe(h.activeIssuerProfileId);

      const now = h.clock.now();
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Ambiguous Twin LLP",
          gstin: "27AMBIG0000A1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "3 Ambiguity Rd",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: first.issueAt,
          lifecycleStatus: "active",
          now,
        }),
      );

      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: `fd-ic10-new-${randomUUID()}`,
            issueAt: first.issueAt,
          }),
        ),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_AMBIGUOUS" });
    });
  });

  it("FD-IC11 historical retry unaffected by later overlapping profiles", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const key = `fd-ic11-${randomUUID()}`;
      const command = buildIssueCommand(h, { logicalIssuanceKey: key });
      const first = await issueFinancialDocument(h.persistence, command);

      const now = h.clock.now();
      await h.persistence.transaction(async (tx) =>
        insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.organizationId,
          legalEntityId: h.legalEntityId,
          profileVersion: 3,
          gstLegalName: "Post-Issue Overlap",
          gstin: "27HISTO0000H1Z5",
          stateCode: "27",
          registrationScheme: "regular",
          registrationStatus: "registered",
          registeredAddressLine1: "4 History St",
          defaultSacCode: "9983",
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: first.issueAt,
          lifecycleStatus: "active",
          now,
        }),
      );

      // Current NEW issuance would be ambiguous; historical retry must still return.
      await expect(
        issueFinancialDocument(
          h.persistence,
          buildIssueCommand(h, {
            logicalIssuanceKey: `fd-ic11-new-${randomUUID()}`,
            issueAt: first.issueAt,
          }),
        ),
      ).rejects.toMatchObject({ code: "ISSUER_PROFILE_AMBIGUOUS" });

      const retry = await issueFinancialDocument(h.persistence, command);
      expect(retry.id).toBe(first.id);
      expect(retry.statutoryDocumentNumber).toBe(first.statutoryDocumentNumber);
      expect(retry.issuerProfileId).toBe(first.issuerProfileId);
      expect(retry.issuerProfileVersion).toBe(first.issuerProfileVersion);
    });
  });
});
