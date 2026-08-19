/**
 * IMP-028 Slice 5 — Customer Financial Document access / read foundation
 * (FD-AC01 … FD-AC18).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { addCartLine, type CustomerActor } from "../../src/server/cart";
import {
  allocateStatutoryNumber,
  generateCustomerFinancialDocumentArtifact,
  getCustomerFinancialDocument,
  insertIssuedFinancialDocument,
  insertIssuerProfile,
  insertNumberingSeries,
  issueFinancialDocument,
  listFinancialDocumentsForCustomerOrder,
  loadFinancialDocument,
  resolveCustomerFinancialDocumentOwnership,
} from "../../src/server/financial-document";
import { startPayment } from "../../src/server/payment";
import type { Persistence } from "../../src/server/persistence/types";
import {
  buildIssueCommand,
  closeTrackedPersistenceHandles,
  withFinancialDocumentIssuanceHarness,
  type FinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";
import { signFinancialDocumentWithRenderedPdf } from "./support/manual-signed-upload-fixtures";
import { createSavedAddressForCustomer } from "./support/checkout-fixtures";
import {
  bringCheckoutToReady,
  createFakePaymentProvider,
  newIdempotencyKey,
  paymentOpts,
  verifyAndProcessWebhook,
} from "./support/payment-fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");

const BOS_LINES = [
  {
    lineNumber: 1,
    description: "BoS sealed line",
    quantity: 1,
    unitPaise: 10000n,
    discountPaise: 0n,
    chargePaise: 0n,
    taxableValuePaise: 10000n,
    sacCode: "9983",
    taxComponents: [] as const,
  },
];

const BOS_TOTALS = {
  taxableTotalPaise: 10000n,
  taxTotalPaise: 0n,
  discountTotalPaise: 0n,
  chargeTotalPaise: 0n,
  grandTotalPaise: 10000n,
} as const;

afterEach(async () => {
  await closeTrackedPersistenceHandles();
  vi.restoreAllMocks();
});

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    text += "\n";
  }
  return text;
}

async function completeSecondCustomerOrder(
  h: FinancialDocumentIssuanceHarness,
): Promise<{
  orderId: string;
  checkoutId: string;
  checkoutSnapshotId: string;
  paymentId: string;
  actor: CustomerActor;
}> {
  const variantId = await h.persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select variant_id::text as id
      from app.checkout_snapshot_lines
      where snapshot_id = ${h.checkoutSnapshotId}::uuid
      limit 1
    `);
    return r.rows[0]!.id as string;
  });

  const actorB = h.actors.customerB;
  const added = await addCartLine(
    h.persistence,
    { kind: "customer", actor: actorB, brandId: h.brandId },
    { variantId, quantity: 1 },
  );
  const address = await createSavedAddressForCustomer(
    h.persistence,
    h.actors.customerBId,
  );
  const ready = await bringCheckoutToReady(
    h.persistence,
    actorB,
    added.cart.id,
    address.id,
  );
  const provider = createFakePaymentProvider({ defaultOutcome: "pending" });
  const opts = paymentOpts(provider);
  const started = await startPayment(
    h.persistence,
    actorB,
    {
      checkoutId: ready.checkoutId,
      expectedCheckoutRevision: ready.revision,
      paymentMethodIntent: "upi",
      idempotencyKey: newIdempotencyKey("fd-ac-b"),
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
  const order = await h.persistence.withContext(async (ctx) => {
    const r = await ctx.db.execute(sql`
      select
        id::text as id,
        checkout_id::text as "checkoutId",
        checkout_snapshot_id::text as "checkoutSnapshotId",
        payment_id::text as "paymentId"
      from app.orders
      where checkout_id = ${ready.checkoutId}::uuid
      limit 1
    `);
    return r.rows[0] as {
      id: string;
      checkoutId: string;
      checkoutSnapshotId: string;
      paymentId: string;
    };
  });
  return {
    orderId: order.id,
    checkoutId: order.checkoutId,
    checkoutSnapshotId: order.checkoutSnapshotId,
    paymentId: order.paymentId,
    actor: actorB,
  };
}

describe("IMP-028 Financial Document customer access foundation (FD-AC01..FD-AC18)", () => {
  it("FD-AC01 Authorized customer can access own issued Financial Document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: doc.id,
      });
      expect(access.document.id).toBe(doc.id);
      expect(access.document.status).toBe("ISSUED");
      expect(access.priorFinancialDocument).toBeNull();
    });
  });

  it("FD-AC02 Different customer cannot access another customer's Financial Document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      await expect(
        getCustomerFinancialDocument(h.persistence, h.actors.customerB, {
          financialDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({
        name: "FinancialDocumentError",
        code: "DOCUMENT_NOT_FOUND",
      });
    });
  });

  it("FD-AC03 Unknown Financial Document fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await expect(
        getCustomerFinancialDocument(h.persistence, h.actor, {
          financialDocumentId: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-AC04 Arbitrary document UUID cannot bypass ownership", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      await expect(
        getCustomerFinancialDocument(h.persistence, h.actors.customerB, {
          financialDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
      await expect(
        getCustomerFinancialDocument(h.persistence, h.actors.customerB, {
          financialDocumentId: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-AC05 Order discovery returns only Financial Documents belonging to authorized customer/order", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const a = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac05-a-${randomUUID()}` }),
      );
      const b = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "BILL_OF_SUPPLY",
          logicalIssuanceKey: `fd-ac05-b-${randomUUID()}`,
          lines: [...BOS_LINES],
          ...BOS_TOTALS,
        }),
      );
      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      const ids = listed.map((item) => item.financialDocumentId);
      expect(ids).toContain(a.id);
      expect(ids).toContain(b.id);
      expect(listed.every((item) => item.orderId === h.orderId)).toBe(true);
    });
  });

  it("FD-AC06 Documents for another order are not included", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const own = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac06-own-${randomUUID()}` }),
      );
      const other = await completeSecondCustomerOrder(h);
      const otherDoc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-ac06-other-${randomUUID()}`,
          checkoutId: other.checkoutId,
          checkoutSnapshotId: other.checkoutSnapshotId,
          paymentId: other.paymentId,
          orderId: other.orderId,
        }),
      );

      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      const ids = listed.map((item) => item.financialDocumentId);
      expect(ids).toContain(own.id);
      expect(ids).not.toContain(otherDoc.id);

      await expect(
        listFinancialDocumentsForCustomerOrder(h.persistence, h.actor, {
          orderId: other.orderId,
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-AC07 Multiple documents for same order are returned deterministically", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const base = h.clock.now().getTime();
      const t0 = new Date(base);
      const t1 = new Date(base + 60_000);
      const t2 = new Date(base + 120_000);

      const earliest = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "BILL_OF_SUPPLY",
          logicalIssuanceKey: `fd-ac07-earliest-${randomUUID()}`,
          issueAt: t0,
          lines: [...BOS_LINES],
          ...BOS_TOTALS,
        }),
      );
      const middle = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-ac07-middle-${randomUUID()}`,
          issueAt: t1,
        }),
      );
      const latest = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-ac07-latest-${randomUUID()}`,
          issueAt: t2,
          priorFinancialDocumentId: middle.id,
        }),
      );

      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      expect(listed.map((d) => d.financialDocumentId)).toEqual([
        earliest.id,
        middle.id,
        latest.id,
      ]);

      // Tie-break: same issueAt → statutoryDocumentNumber ASC, then id ASC.
      const tieA = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-ac07-tie-a-${randomUUID()}`,
          issueAt: t2,
        }),
      );
      const tieB = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-ac07-tie-b-${randomUUID()}`,
          issueAt: t2,
        }),
      );
      const withTies = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      const tied = withTies.filter(
        (d) =>
          d.financialDocumentId === tieA.id || d.financialDocumentId === tieB.id,
      );
      expect(tied).toHaveLength(2);
      const orderedByNumber = [tieA, tieB].sort((a, b) => {
        if (a.statutoryDocumentNumber < b.statutoryDocumentNumber) return -1;
        if (a.statutoryDocumentNumber > b.statutoryDocumentNumber) return 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      expect(tied.map((d) => d.financialDocumentId)).toEqual(
        orderedByNumber.map((d) => d.id),
      );

      const again = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      expect(again.map((d) => d.financialDocumentId)).toEqual(
        withTies.map((d) => d.financialDocumentId),
      );
    });
  });

  it("FD-AC08 Credit Note access automatically resolves exact prior Tax Invoice from sealed priorFinancialDocumentId", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac08-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-ac08-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: creditNote.id,
      });
      expect(access.document.id).toBe(creditNote.id);
      expect(access.priorFinancialDocument?.id).toBe(invoice.id);
      expect(access.priorFinancialDocument?.documentType).toBe("TAX_INVOICE");
      expect(access.priorFinancialDocument?.id).toBe(
        access.document.priorFinancialDocumentId,
      );
    });
  });

  it("FD-AC09 Caller cannot substitute a different prior Financial Document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac09-ti-${randomUUID()}` }),
      );
      const otherInvoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac09-ti2-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-ac09-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );

      await expect(
        getCustomerFinancialDocument(h.persistence, h.actor, {
          financialDocumentId: creditNote.id,
          priorFinancialDocumentId: otherInvoice.id,
        } as never),
      ).rejects.toMatchObject({ code: "INVALID_ACCESS_INPUT" });

      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: creditNote.id,
      });
      expect(access.priorFinancialDocument?.id).toBe(invoice.id);
      expect(access.priorFinancialDocument?.id).not.toBe(otherInvoice.id);
    });
  });

  it("FD-AC10 Inconsistent prior commercial/customer graph fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const ownInvoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac10-own-${randomUUID()}` }),
      );
      const other = await completeSecondCustomerOrder(h);
      const foreignInvoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-ac10-foreign-${randomUUID()}`,
          checkoutId: other.checkoutId,
          checkoutSnapshotId: other.checkoutSnapshotId,
          paymentId: other.paymentId,
          orderId: other.orderId,
        }),
      );

      const corrupt = await h.persistence.transaction(async (tx) => {
        const allocated = await tx.db.execute(sql`
          select next_sequence::text as n, prefix
          from app.financial_document_numbering_series
          where id = ${h.creditNoteSeriesId}::uuid
          for update
        `);
        const seq = BigInt(String(allocated.rows[0]?.n));
        const prefix = String(allocated.rows[0]?.prefix);
        await tx.db.execute(sql`
          update app.financial_document_numbering_series
          set next_sequence = ${(seq + 1n).toString()}::bigint,
              updated_at = ${h.clock.now()}
          where id = ${h.creditNoteSeriesId}::uuid
        `);
        return insertIssuedFinancialDocument(tx, {
          documentType: "CREDIT_NOTE",
          statutoryDocumentNumber: `${prefix}${seq.toString().padStart(6, "0")}`,
          issueAt: h.clock.now(),
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-ac10-corrupt-${randomUUID()}`,
          numberingSeriesId: h.creditNoteSeriesId,
          sequenceNumber: seq,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.activeIssuerProfileId,
          issuerProfileVersion: h.activeIssuerProfileVersion,
          taxableTotalPaise: 10000n,
          taxTotalPaise: 500n,
          discountTotalPaise: 0n,
          chargeTotalPaise: 0n,
          grandTotalPaise: 10500n,
          checkoutId: h.checkoutId,
          checkoutSnapshotId: h.checkoutSnapshotId,
          paymentId: h.paymentId,
          orderId: h.orderId,
          priorFinancialDocumentId: foreignInvoice.id,
          priorDocumentType: "TAX_INVOICE",
          lines: [
            {
              lineNumber: 1,
              description: "Corrupt prior graph",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              lineTotalPaise: 10500n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
              ],
            },
          ],
          now: h.clock.now(),
        });
      });

      expect(ownInvoice.id).not.toBe(foreignInvoice.id);
      await expect(
        getCustomerFinancialDocument(h.persistence, h.actor, {
          financialDocumentId: corrupt.id,
        }),
      ).rejects.toMatchObject({ code: "AUTHORITY_INCONSISTENT" });
    });
  });

  it("FD-AC11 Artifact operation for authorized customer succeeds", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac11-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-ac11-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, creditNote.id);
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: creditNote.id },
      );
      expect(artifact.mediaType).toBe("application/pdf");
      expect(artifact.byteLength).toBeGreaterThan(100);
      expect(Buffer.from(artifact.bytes.subarray(0, 5)).toString("utf8")).toBe(
        "%PDF-",
      );
    });
  });

  it("FD-AC12 Artifact operation for unauthorized customer fails before artifact bytes are returned", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      await expect(
        generateCustomerFinancialDocumentArtifact(
          h.persistence,
          h.actors.customerB,
          { financialDocumentId: doc.id },
        ),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-AC13 Internal UUIDs remain absent from generated customer PDF content", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac13-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-ac13-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, creditNote.id);
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: creditNote.id },
      );
      const text = await extractPdfText(artifact.bytes);
      const raw = Buffer.from(artifact.bytes).toString("latin1");
      for (const id of [
        creditNote.id,
        invoice.id,
        creditNote.issuerProfileId,
        creditNote.numberingSeriesId,
        creditNote.checkoutId,
        creditNote.orderId,
        h.checkoutId,
        h.orderId,
      ]) {
        if (id) {
          expect(text).not.toContain(id);
          expect(raw).not.toContain(id);
        }
      }
    });
  });

  it("FD-AC14 Listing metadata does not expose issuerProfileId/numberingSeriesId/internal commercial graph fields", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      expect(listed.length).toBeGreaterThan(0);
      const item = listed[0]!;
      expect(Object.keys(item).sort()).toEqual(
        [
          "currency",
          "documentType",
          "financialDocumentId",
          "grandTotalPaise",
          "issueAt",
          "orderId",
          "statutoryDocumentNumber",
        ].sort(),
      );
      expect(item.currency).toBe("INR");
      expect(item.orderId).toBe(h.orderId);
      expect(item).not.toHaveProperty("issuerProfileId");
      expect(item).not.toHaveProperty("numberingSeriesId");
      expect(item).not.toHaveProperty("checkoutSnapshotId");
      expect(item).not.toHaveProperty("checkoutId");
      expect(item).not.toHaveProperty("paymentId");
      expect(item).not.toHaveProperty("refundId");
      expect(item).not.toHaveProperty("logicalIssuanceKey");
      expect(item).not.toHaveProperty("lines");
    });
  });

  it("FD-AC15 No live issuer/customer/catalog configuration is needed to access/render a historical issued document", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));

      // Referenced issuer profiles are immutable after issuance (Slice-1 integrity).
      // Prove access/render uses sealed document authority only — no live profile
      // resolution, catalog, or customer-profile lookups.
      const accessSource = readFileSync(
        path.join(REPO_ROOT, "src/server/financial-document/customer-access.ts"),
        "utf8",
      );
      expect(accessSource).not.toMatch(
        /profile-resolution|resolveEffectiveIssuerProfile|findIssuerProfile/,
      );
      expect(accessSource).not.toMatch(/customer-profiles|catalog\/|assortment/);

      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: doc.id,
      });
      expect(access.document.id).toBe(doc.id);
      expect(access.document.supplierGstin).toBe(doc.supplierGstin);
      expect(access.document.recipientDisplayName).toBe(doc.recipientDisplayName);

      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: doc.id },
      );
      expect(artifact.byteLength).toBeGreaterThan(0);
      const text = await extractPdfText(artifact.bytes);
      expect(text).toContain(doc.statutoryDocumentNumber);
    });
  });

  it("FD-AC16 No customer PII is written to logs by access operations", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          recipientDisplayName: "PII Customer Name",
          logicalIssuanceKey: `fd-ac16-${randomUUID()}`,
        }),
      );
      await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: doc.id,
      });
      await listFinancialDocumentsForCustomerOrder(h.persistence, h.actor, {
        orderId: h.orderId,
      });
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      await generateCustomerFinancialDocumentArtifact(h.persistence, h.actor, {
        financialDocumentId: doc.id,
      });
    });

    const combined = [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...debugSpy.mock.calls,
    ]
      .flat()
      .map((v) => String(v))
      .join("\n");
    expect(combined).not.toContain("PII Customer Name");
    expect(combined).not.toMatch(/<!DOCTYPE html/i);
    expect(combined).not.toContain("%PDF-");

    const accessSource = readFileSync(
      path.join(REPO_ROOT, "src/server/financial-document/customer-access.ts"),
      "utf8",
    );
    expect(accessSource).not.toMatch(/console\.(log|info|warn|error|debug)/);
  });

  it("FD-AC17 Customer-access remains HTTP-free; no Next.js API/UI; transport uses Slice-5 only", () => {
    const accessSource = readFileSync(
      path.join(REPO_ROOT, "src/server/financial-document/customer-access.ts"),
      "utf8",
    );
    expect(accessSource).not.toMatch(/NextResponse|app\/api|route\.ts/);
    expect(accessSource).not.toMatch(/\bdownloadEndpoint\b|\bsignedUrl\b/i);

    const appApi = path.join(REPO_ROOT, "src/app/api");
    let apiFiles: string[] = [];
    try {
      apiFiles = readdirSync(appApi, { recursive: true }).map(String);
    } catch {
      apiFiles = [];
    }
    expect(
      apiFiles.filter((f) => /financial|invoice|credit.?note|document/i.test(f)),
    ).toEqual([]);

    // Slice 6 may expose customer-commerce transport routes, but ownership /
    // artifact generation must go through Slice-5 access service only.
    const router = readFileSync(
      path.join(REPO_ROOT, "src/server/customer-commerce/http/router.ts"),
      "utf8",
    );
    expect(router).toMatch(/\blistFinancialDocumentsForCustomerOrder\b/);
    expect(router).toMatch(/\bgenerateCustomerFinancialDocumentArtifact\b/);
    expect(router).not.toMatch(/\bgenerateFinancialDocumentArtifact\b/);
    expect(router).not.toMatch(/\bloadFinancialDocument\b/);
    expect(router).not.toMatch(/\blistFinancialDocumentsForOrder\b/);
    expect(router).not.toMatch(/financial-document\/repository/);
    expect(router).not.toMatch(/shared\/financial-document\/artifact/);
  });

  it("FD-AC18 Existing FD authority/render/artifact behavior remains unchanged", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const before = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-ac18-${randomUUID()}` }),
      );
      const reloaded = await h.persistence.withContext((ctx) =>
        loadFinancialDocument(ctx, before.id),
      );
      expect(reloaded?.id).toBe(before.id);
      expect(reloaded?.statutoryDocumentNumber).toBe(before.statutoryDocumentNumber);
      expect(reloaded?.grandTotalPaise).toBe(before.grandTotalPaise);

      const second = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "BILL_OF_SUPPLY",
          logicalIssuanceKey: `fd-ac18-bos-${randomUUID()}`,
          lines: [...BOS_LINES],
          ...BOS_TOTALS,
        }),
      );
      expect(second.status).toBe("ISSUED");
      expect(second.documentType).toBe("BILL_OF_SUPPLY");
    });
  });

  it("anonymous / non-actor is denied at application boundary", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(h.persistence, buildIssueCommand(h));
      await expect(
        getCustomerFinancialDocument(
          h.persistence,
          { authUserId: h.actor.authUserId },
          { financialDocumentId: doc.id },
        ),
      ).rejects.toMatchObject({ code: "CUSTOMER_AUTH_REQUIRED" });
    });
  });
});

/**
 * IMP-028 Slice 5 correction — customer-access eligibility contract
 * (FD-ACC01 … FD-ACC10) + existence non-oracle.
 *
 * Future automatic BOBA Direct issuance that produces customer-downloadable
 * Financial Documents must supply a durable Checkout/Order/Payment/Refund
 * commercial graph from which ownership is provable. No Payment→Invoice /
 * Receipt Voucher selection is made in this suite.
 */
describe("IMP-028 Slice 5 correction — customer-access eligibility (FD-ACC01..FD-ACC10)", () => {
  const noCustomerCommerce = {
    checkoutId: null,
    checkoutSnapshotId: null,
    paymentId: null,
    orderId: null,
    refundId: null,
  } as const;

  async function expectDocumentNotFound(
    persistence: Persistence,
    actor: FinancialDocumentIssuanceHarness["actor"],
    financialDocumentId: string,
  ): Promise<void> {
    await expect(
      getCustomerFinancialDocument(persistence, actor, { financialDocumentId }),
    ).rejects.toMatchObject({
      name: "FinancialDocumentError",
      code: "DOCUMENT_NOT_FOUND",
    });
  }

  it("FD-ACC01 Issued TAX_INVOICE with no checkout/order path is not customer-accessible", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-acc01-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      expect(doc.checkoutId).toBeNull();
      expect(doc.orderId).toBeNull();

      const ownership = await h.persistence.withContext((ctx) =>
        resolveCustomerFinancialDocumentOwnership(ctx, doc, h.actor.authUserId),
      );
      expect(ownership.kind).toBe("NO_CUSTOMER_OWNERSHIP_PATH");

      await expectDocumentNotFound(h.persistence, h.actor, doc.id);
    });
  });

  it("FD-ACC02 Issued BILL_OF_SUPPLY with no checkout/order path is not customer-accessible", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "BILL_OF_SUPPLY",
          logicalIssuanceKey: `fd-acc02-${randomUUID()}`,
          lines: [...BOS_LINES],
          ...BOS_TOTALS,
          ...noCustomerCommerce,
        }),
      );
      expect(doc.checkoutId).toBeNull();
      expect(doc.orderId).toBeNull();
      await expectDocumentNotFound(h.persistence, h.actor, doc.id);
    });
  });

  it("FD-ACC03 Issued RECEIPT_VOUCHER with no checkout/order path is not customer-accessible", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "RECEIPT_VOUCHER",
          logicalIssuanceKey: `fd-acc03-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      expect(doc.checkoutId).toBeNull();
      expect(doc.orderId).toBeNull();
      await expectDocumentNotFound(h.persistence, h.actor, doc.id);
    });
  });

  it("FD-ACC04 Credit Note without customer path is not customer-accessible", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const prior = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-acc04-ti-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-acc04-cn-${randomUUID()}`,
          priorFinancialDocumentId: prior.id,
          ...noCustomerCommerce,
        }),
      );
      expect(creditNote.checkoutId).toBeNull();
      expect(creditNote.orderId).toBeNull();
      await expectDocumentNotFound(h.persistence, h.actor, creditNote.id);
    });
  });

  it("FD-ACC05 Customer-associated TAX_INVOICE remains accessible to correct customer", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc05-${randomUUID()}` }),
      );
      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: doc.id,
      });
      expect(access.document.id).toBe(doc.id);
      expect(access.document.checkoutId).toBe(h.checkoutId);
      expect(access.document.orderId).toBe(h.orderId);
    });
  });

  it("FD-ACC06 Customer-associated document remains inaccessible to another customer", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc06-${randomUUID()}` }),
      );
      const ownership = await h.persistence.withContext((ctx) =>
        resolveCustomerFinancialDocumentOwnership(
          ctx,
          doc,
          h.actors.customerB.authUserId,
        ),
      );
      expect(ownership.kind).toBe("OWNED_BY_OTHER_CUSTOMER");
      await expectDocumentNotFound(h.persistence, h.actors.customerB, doc.id);
    });
  });

  it("FD-ACC07 Prior Financial Document different legalEntityId → AUTHORITY_INCONSISTENT", async () => {
    // Cross-entity prior linkage is impossible via issueFinancialDocument
    // (Slice-2 rejects it) and issued rows are immutable (ARCH-G16). Insert
    // both documents directly with consistent-per-entity series/profile scope
    // to simulate sealed corruption for customer-access defense-in-depth.
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const now = h.clock.now();
      const { prior, creditNote } = await h.persistence.transaction(async (tx) => {
        const foreignProfile = await insertIssuerProfile(tx, {
          brandId: h.brandId,
          organizationId: h.tree.orgB.id,
          legalEntityId: h.tree.leB.id,
          profileVersion: 1,
          reverseChargeApplicable: false,
          enableTaxInvoice: true,
          validFrom: now,
          lifecycleStatus: "draft",
          now,
        });
        const foreignSeries = await insertNumberingSeries(tx, {
          legalEntityId: h.tree.leB.id,
          documentType: "TAX_INVOICE",
          financialYear: h.financialYear,
          seriesCode: "TI-ACC07-B",
          prefix: "TAB/2526/",
          now,
        });
        const priorAllocated = await allocateStatutoryNumber(
          tx,
          foreignSeries.id,
          now,
        );
        const prior = await insertIssuedFinancialDocument(tx, {
          documentType: "TAX_INVOICE",
          statutoryDocumentNumber: priorAllocated.statutoryDocumentNumber,
          issueAt: now,
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-acc07-ti-${randomUUID()}`,
          numberingSeriesId: foreignSeries.id,
          sequenceNumber: priorAllocated.sequenceNumber,
          legalEntityId: h.tree.leB.id,
          issuerProfileId: foreignProfile.id,
          issuerProfileVersion: foreignProfile.profileVersion,
          taxableTotalPaise: 10000n,
          taxTotalPaise: 500n,
          discountTotalPaise: 0n,
          chargeTotalPaise: 0n,
          grandTotalPaise: 10500n,
          checkoutId: h.checkoutId,
          checkoutSnapshotId: h.checkoutSnapshotId,
          paymentId: h.paymentId,
          orderId: h.orderId,
          lines: [
            {
              lineNumber: 1,
              description: "Cross-entity prior fixture",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              lineTotalPaise: 10500n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
              ],
            },
          ],
          now,
        });

        const cnAllocated = await allocateStatutoryNumber(
          tx,
          h.creditNoteSeriesId,
          now,
        );
        const creditNote = await insertIssuedFinancialDocument(tx, {
          documentType: "CREDIT_NOTE",
          statutoryDocumentNumber: cnAllocated.statutoryDocumentNumber,
          issueAt: now,
          financialYear: h.financialYear,
          logicalIssuanceKey: `fd-acc07-cn-${randomUUID()}`,
          numberingSeriesId: h.creditNoteSeriesId,
          sequenceNumber: cnAllocated.sequenceNumber,
          legalEntityId: h.legalEntityId,
          issuerProfileId: h.activeIssuerProfileId,
          issuerProfileVersion: h.activeIssuerProfileVersion,
          taxableTotalPaise: 10000n,
          taxTotalPaise: 500n,
          discountTotalPaise: 0n,
          chargeTotalPaise: 0n,
          grandTotalPaise: 10500n,
          checkoutId: h.checkoutId,
          checkoutSnapshotId: h.checkoutSnapshotId,
          paymentId: h.paymentId,
          orderId: h.orderId,
          priorFinancialDocumentId: prior.id,
          priorDocumentType: "TAX_INVOICE",
          lines: [
            {
              lineNumber: 1,
              description: "Cross-entity prior CN",
              quantity: 1,
              unitPaise: 10000n,
              discountPaise: 0n,
              chargePaise: 0n,
              taxableValuePaise: 10000n,
              lineTotalPaise: 10500n,
              sacCode: "9983",
              taxComponents: [
                {
                  taxType: "cgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
                {
                  taxType: "sgst",
                  rateBps: 250,
                  taxableAmountPaise: 10000n,
                  taxAmountPaise: 250n,
                },
              ],
            },
          ],
          now,
        });
        return { prior, creditNote };
      });

      expect(prior.legalEntityId).toBe(h.tree.leB.id);
      expect(creditNote.legalEntityId).toBe(h.legalEntityId);
      expect(prior.legalEntityId).not.toBe(creditNote.legalEntityId);

      await expect(
        getCustomerFinancialDocument(h.persistence, h.actor, {
          financialDocumentId: creditNote.id,
        }),
      ).rejects.toMatchObject({
        name: "FinancialDocumentError",
        code: "AUTHORITY_INCONSISTENT",
      });
    });
  });

  it("FD-ACC08 Prior same legal entity + correct ownership remains accepted", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc08-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-acc08-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      expect(creditNote.legalEntityId).toBe(invoice.legalEntityId);

      const access = await getCustomerFinancialDocument(h.persistence, h.actor, {
        financialDocumentId: creditNote.id,
      });
      expect(access.document.id).toBe(creditNote.id);
      expect(access.priorFinancialDocument?.id).toBe(invoice.id);
      expect(access.priorFinancialDocument?.legalEntityId).toBe(
        creditNote.legalEntityId,
      );
    });
  });

  it("FD-ACC09 Order document listing includes order-sealed docs and excludes unrelated orphans", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const associated = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc09-a-${randomUUID()}` }),
      );
      const orphan = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-acc09-orphan-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );

      const listed = await listFinancialDocumentsForCustomerOrder(
        h.persistence,
        h.actor,
        { orderId: h.orderId },
      );
      const ids = listed.map((item) => item.financialDocumentId);
      expect(ids).toContain(associated.id);
      expect(ids).not.toContain(orphan.id);
      expect(
        listed.every(
          (item) =>
            item.orderId === h.orderId || item.orderId === null,
        ),
      ).toBe(true);
    });
  });

  it("FD-ACC10 Historical customer artifact generation unchanged", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc10-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-acc10-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, creditNote.id);
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: creditNote.id },
      );
      expect(artifact.mediaType).toBe("application/pdf");
      expect(artifact.byteLength).toBeGreaterThan(100);
      expect(Buffer.from(artifact.bytes.subarray(0, 5)).toString("utf8")).toBe(
        "%PDF-",
      );

      const text = await extractPdfText(artifact.bytes);
      expect(text).toContain(creditNote.statutoryDocumentNumber);
      expect(text).not.toContain(creditNote.id);
      expect(text).not.toContain(invoice.id);
    });
  });

  it("existence non-oracle: unknown / other-customer / no-ownership-path are indistinguishable", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const owned = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-acc-oracle-own-${randomUUID()}` }),
      );
      const orphan = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-acc-oracle-orphan-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      const unknownId = randomUUID();

      const results = await Promise.allSettled([
        getCustomerFinancialDocument(h.persistence, h.actors.customerB, {
          financialDocumentId: unknownId,
        }),
        getCustomerFinancialDocument(h.persistence, h.actors.customerB, {
          financialDocumentId: owned.id,
        }),
        getCustomerFinancialDocument(h.persistence, h.actor, {
          financialDocumentId: orphan.id,
        }),
      ]);

      for (const result of results) {
        expect(result.status).toBe("rejected");
        if (result.status === "rejected") {
          expect(result.reason).toMatchObject({
            name: "FinancialDocumentError",
            code: "DOCUMENT_NOT_FOUND",
          });
        }
      }
    });
  });
});

// Keep Persistence type referenced for harness clarity.
void (0 as unknown as Persistence);
