/**
 * Financial Document rendering foundation tests (IMP-028 Slice 3).
 * FD-R01 … FD-R18
 * FD-RC01 … FD-RC08 (identity-bound prior authority correction)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT,
  FinancialDocumentError,
  formatInrPaise,
  formatRateBps,
  formatStatutoryDocumentTitle,
  renderFinancialDocument,
  type FinancialDocument,
  type FinancialDocumentStatutoryType,
} from "./index";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const ISSUE_AT = new Date("2025-08-15T10:30:00.000Z");
const PRIOR_ISSUE_AT = new Date("2025-08-14T09:00:00.000Z");

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";
const UUID_PRIOR = "44444444-4444-4444-8444-444444444444";
const UUID_UNRELATED = "55555555-5555-4555-8555-555555555555";
const UUID_LINE = "66666666-6666-4666-8666-666666666666";

function baseDocument(
  overrides: Partial<FinancialDocument> & {
    documentType?: FinancialDocumentStatutoryType;
  } = {},
): FinancialDocument {
  const documentType = overrides.documentType ?? "TAX_INVOICE";
  return {
    id: UUID_A,
    documentType,
    status: "ISSUED",
    statutoryDocumentNumber: "TI/2526/000001",
    issueAt: ISSUE_AT,
    financialYear: "2025-26",
    currency: "INR",
    logicalIssuanceKey: "fd-key-1",
    numberingSeriesId: UUID_B,
    sequenceNumber: BigInt(1),
    legalEntityId: UUID_C,
    issuerProfileId: UUID_B,
    issuerProfileVersion: 1,
    supplierGstLegalName: "BOBA Bear Foods Private Limited",
    supplierGstin: "29AABCB1234A1Z5",
    supplierRegisteredAddress: "12 MG Road, Bengaluru, 560001",
    supplierStateCode: "29",
    supplierRegistrationScheme: "regular",
    recipientDisplayName: "Asha Customer",
    recipientPhoneE164: "+919876543210",
    recipientAddress: "45 Residency Road, Bengaluru",
    taxableTotalPaise: BigInt(10000),
    taxTotalPaise: BigInt(500),
    discountTotalPaise: BigInt(0),
    chargeTotalPaise: BigInt(0),
    grandTotalPaise: BigInt(10500),
    placeOfSupplyStateCode: "29",
    reverseChargeApplicable: false,
    checkoutId: UUID_C,
    checkoutSnapshotId: UUID_B,
    paymentId: UUID_A,
    refundId: null,
    orderId: UUID_C,
    priorFinancialDocumentId: null,
    priorDocumentType: null,
    createdAt: ISSUE_AT,
    lines: [
      {
        id: UUID_LINE,
        financialDocumentId: UUID_A,
        lineNumber: 1,
        description: "Classic Milk Tea",
        quantity: 2,
        unitPaise: BigInt(5000),
        discountPaise: BigInt(0),
        chargePaise: BigInt(0),
        taxableValuePaise: BigInt(10000),
        lineTotalPaise: BigInt(10500),
        sacCode: "996331",
        hsnCode: null,
        historicalCatalogItemId: "catalog-item-historical-1",
        taxComponents: [
          {
            id: UUID_B,
            financialDocumentLineId: UUID_LINE,
            taxType: "cgst",
            rateBps: 250,
            taxableAmountPaise: BigInt(10000),
            taxAmountPaise: BigInt(250),
          },
          {
            id: UUID_C,
            financialDocumentLineId: UUID_LINE,
            taxType: "sgst",
            rateBps: 250,
            taxableAmountPaise: BigInt(10000),
            taxAmountPaise: BigInt(250),
          },
        ],
      },
    ],
    ...overrides,
  };
}

function priorTaxInvoice(
  overrides: Partial<FinancialDocument> = {},
): FinancialDocument {
  return baseDocument({
    id: UUID_PRIOR,
    documentType: "TAX_INVOICE",
    statutoryDocumentNumber: "TI/2526/000001",
    issueAt: PRIOR_ISSUE_AT,
    logicalIssuanceKey: "fd-prior-ti",
    priorFinancialDocumentId: null,
    priorDocumentType: null,
    ...overrides,
  });
}

function creditNote(
  overrides: Partial<FinancialDocument> = {},
): FinancialDocument {
  return baseDocument({
    id: UUID_A,
    documentType: "CREDIT_NOTE",
    statutoryDocumentNumber: "CN/2526/000001",
    priorFinancialDocumentId: UUID_PRIOR,
    priorDocumentType: "TAX_INVOICE",
    logicalIssuanceKey: "fd-cn-1",
    ...overrides,
  });
}

function assertNoLiveLookupImports(fileName: string): void {
  const source = readFileSync(path.join(HERE, fileName), "utf8");
  expect(source).not.toMatch(/from ["'].*menu/);
  expect(source).not.toMatch(/from ["'].*catalog/);
  expect(source).not.toMatch(/from ["'].*profile-resolution/);
  expect(source).not.toMatch(/from ["'].*customer-profile/);
  expect(source).not.toMatch(/from ["'].*\/payment/);
  expect(source).not.toMatch(/from ["'].*\/refund/);
  expect(source).not.toMatch(/from ["'].*\/order/);
  expect(source).not.toMatch(/from ["'].*repository/);
  expect(source).not.toMatch(/from ["'].*database/);
  expect(source).not.toMatch(/findCatalog|loadMenu|getProduct/);
  expect(source).not.toMatch(/findIssuerProfile|resolveEffectiveIssuer/i);
  expect(source).not.toMatch(/\bfindCustomer\b|\bloadCustomer\b/);
}

describe("IMP-028 Financial Document rendering foundation", () => {
  it("FD-R01 TAX_INVOICE renders deterministically", () => {
    const doc = baseDocument({ documentType: "TAX_INVOICE" });
    const r1 = renderFinancialDocument(doc);
    const r2 = renderFinancialDocument(doc);
    expect(r1.model.statutoryTitle).toBe("Tax Invoice");
    expect(r1.html).toContain("Tax Invoice");
    expect(r1.html).toContain("TI/2526/000001");
    expect(r1.html).toBe(r2.html);
    // Representative exact structural markers (not full golden snapshot).
    expect(r1.html).toContain("<h1>Tax Invoice</h1>");
    expect(r1.html).toContain(
      "<div class=\"fd-field\"><dt>Document number</dt><dd>TI/2526/000001</dd></div>",
    );
    expect(r1.html).toContain(
      "<div class=\"fd-field\"><dt>Issue date</dt><dd>2025-08-15 10:30:00 UTC</dd></div>",
    );
  });

  it("FD-R02 BILL_OF_SUPPLY renders with correct statutory title", () => {
    const doc = baseDocument({
      documentType: "BILL_OF_SUPPLY",
      statutoryDocumentNumber: "BOS/2526/000001",
      taxTotalPaise: BigInt(0),
      grandTotalPaise: BigInt(10000),
      lines: [
        {
          ...baseDocument().lines[0]!,
          lineTotalPaise: BigInt(10000),
          taxComponents: [],
        },
      ],
    });
    const { model, html } = renderFinancialDocument(doc);
    expect(model.statutoryTitle).toBe("Bill of Supply");
    expect(html).toContain("<h1>Bill of Supply</h1>");
    expect(html).not.toContain("Tax Invoice");
  });

  it("FD-R03 RECEIPT_VOUCHER renders", () => {
    const doc = baseDocument({
      documentType: "RECEIPT_VOUCHER",
      statutoryDocumentNumber: "RV/2526/000001",
    });
    const { model, html } = renderFinancialDocument(doc);
    expect(model.statutoryTitle).toBe("Receipt Voucher");
    expect(html).toContain("Receipt Voucher");
  });

  it("FD-R04 REFUND_VOUCHER renders", () => {
    const doc = baseDocument({
      documentType: "REFUND_VOUCHER",
      statutoryDocumentNumber: "RFV/2526/000001",
      refundId: UUID_B,
    });
    const { model, html } = renderFinancialDocument(doc);
    expect(model.statutoryTitle).toBe("Refund Voucher");
    expect(html).toContain("Refund Voucher");
  });

  it("FD-R05 CREDIT_NOTE renders prior-document reference from identity-bound prior authority", () => {
    const doc = creditNote();
    const prior = priorTaxInvoice();
    const rendered = renderFinancialDocument(doc, {
      priorFinancialDocument: prior,
    });
    expect(rendered.html).toContain("Prior document");
    expect(rendered.html).toContain("Tax Invoice");
    expect(rendered.model.priorDocument?.documentType).toBe("TAX_INVOICE");
    expect(rendered.model.priorDocument?.statutoryDocumentNumber).toBe(
      "TI/2526/000001",
    );
    expect(rendered.model.priorDocument?.issueDateDisplay).toBe("2025-08-14");
    expect(rendered.html).toContain("TI/2526/000001");
    expect(rendered.html).toContain("2025-08-14");
    expect(rendered.html).not.toContain(UUID_PRIOR);
    expect(rendered.html).toContain("<h1>Credit Note</h1>");
    expect(rendered.html).toContain(
      "<div class=\"fd-field\"><dt>Document number</dt><dd>CN/2526/000001</dd></div>",
    );
  });

  it("FD-R06 No statutory TAX_RECEIPT renderer/type exists", () => {
    expect(FINANCIAL_DOCUMENT_STATUTORY_TYPES).not.toContain(
      FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT,
    );
    expect(FORBIDDEN_STATUTORY_TYPE_TAX_RECEIPT).toBe("TAX_RECEIPT");
    expect(() =>
      formatStatutoryDocumentTitle("TAX_RECEIPT" as FinancialDocumentStatutoryType),
    ).toThrow();

    const renderSource = readFileSync(path.join(HERE, "render.ts"), "utf8");
    const formatSource = readFileSync(path.join(HERE, "format.ts"), "utf8");
    const modelSource = readFileSync(path.join(HERE, "render-model.ts"), "utf8");
    const htmlSource = readFileSync(path.join(HERE, "render-html.ts"), "utf8");
    for (const source of [renderSource, formatSource, modelSource, htmlSource]) {
      expect(source).not.toMatch(/TAX_RECEIPT/);
      expect(source).not.toMatch(/Tax Receipt/);
      expect(source).not.toMatch(/sealedPriorDocument|SealedPriorDocumentRenderRef/);
    }
  });

  it("FD-R07 Money formatting uses exact integer paise", () => {
    expect(formatInrPaise(BigInt(10500))).toBe("₹105.00");
    expect(formatInrPaise(BigInt(0))).toBe("₹0.00");
    expect(formatInrPaise(BigInt(123456789))).toBe("₹12,34,567.89");
    expect(formatInrPaise(BigInt(99))).toBe("₹0.99");
    const { model } = renderFinancialDocument(baseDocument());
    expect(model.totals.grandTotalDisplay).toBe("₹105.00");
    expect(model.totals.grandTotalPaise).toBe(BigInt(10500));
  });

  it("FD-R08 Tax components/rates/amounts reflect sealed data exactly", () => {
    const { model, html } = renderFinancialDocument(baseDocument());
    expect(formatRateBps(250)).toBe("2.50%");
    const line = model.lines[0]!;
    expect(line.taxComponents).toHaveLength(2);
    expect(line.taxComponents[0]!.taxType).toBe("cgst");
    expect(line.taxComponents[0]!.rateBps).toBe(250);
    expect(line.taxComponents[0]!.taxAmountPaise).toBe(BigInt(250));
    expect(line.taxComponents[0]!.taxAmountDisplay).toBe("₹2.50");
    expect(html).toContain("CGST");
    expect(html).toContain("2.50%");
    expect(html).toContain("₹2.50");
  });

  it("FD-R09 Header totals match persisted issued document values and are not recalculated", () => {
    // Intentionally inconsistent sealed line vs header to prove rendering
    // displays header totals as sealed — it does not recompute from lines.
    const doc = baseDocument({
      taxableTotalPaise: BigInt(99999),
      taxTotalPaise: BigInt(1),
      grandTotalPaise: BigInt(100000),
    });
    const { model, html } = renderFinancialDocument(doc);
    expect(model.totals.taxableTotalPaise).toBe(BigInt(99999));
    expect(model.totals.taxTotalPaise).toBe(BigInt(1));
    expect(model.totals.grandTotalPaise).toBe(BigInt(100000));
    expect(html).toContain("₹999.99");
    expect(html).toContain("₹1,000.00");
  });

  it("FD-R10 Renderer performs no current menu/catalog lookup", () => {
    for (const file of ["render-model.ts", "render.ts", "render-html.ts", "format.ts"]) {
      assertNoLiveLookupImports(file);
    }
    const { html } = renderFinancialDocument(baseDocument());
    expect(html).not.toContain("catalog-item-historical-1");
  });

  it("FD-R11 Renderer performs no current issuer-profile lookup", () => {
    for (const file of ["render-model.ts", "render.ts", "render-html.ts", "format.ts"]) {
      assertNoLiveLookupImports(file);
    }
    const doc = baseDocument({
      supplierGstLegalName: "Sealed Historical Supplier Name",
      issuerProfileVersion: 1,
    });
    const { html } = renderFinancialDocument(doc);
    expect(html).toContain("Sealed Historical Supplier Name");
  });

  it("FD-R12 Renderer performs no current customer-profile lookup", () => {
    for (const file of ["render-model.ts", "render.ts", "render-html.ts"]) {
      assertNoLiveLookupImports(file);
    }
    const doc = baseDocument({
      recipientDisplayName: "Sealed Recipient Name",
    });
    const { html } = renderFinancialDocument(doc);
    expect(html).toContain("Sealed Recipient Name");
  });

  it("FD-R13 Historical regeneration is byte/string deterministic for the same sealed document", () => {
    const doc = baseDocument();
    const renders = Array.from({ length: 5 }, () => renderFinancialDocument(doc).html);
    for (let i = 1; i < renders.length; i += 1) {
      expect(renders[i]).toBe(renders[0]);
    }
  });

  it("FD-R14 Sealed issuer facts alone determine output; renderer has no live issuer channel", () => {
    for (const file of ["render-model.ts", "render.ts", "render-html.ts", "format.ts"]) {
      assertNoLiveLookupImports(file);
    }
    const sealed = baseDocument({
      supplierGstLegalName: "Sealed Issuer v1",
      supplierGstin: "29AABCB1234A1Z5",
      issuerProfileVersion: 1,
    });
    const r1 = renderFinancialDocument(sealed);
    // Mutating a second sealed authority object does not affect the first.
    const laterIssuerFacts = baseDocument({
      supplierGstLegalName: "Mutated Current Issuer Name",
      supplierGstin: "27AAAAA0000A1Z5",
      issuerProfileVersion: 2,
    });
    void laterIssuerFacts;
    const r2 = renderFinancialDocument(sealed);
    expect(r2.html).toBe(r1.html);
    expect(r2.html).toContain("Sealed Issuer v1");
    expect(r2.html).not.toContain("Mutated Current Issuer Name");
    expect(r2.html).toContain("29AABCB1234A1Z5");
    expect(r2.html).not.toContain("27AAAAA0000A1Z5");
  });

  it("FD-R15 Sealed line description alone determines output; renderer has no catalog channel", () => {
    for (const file of ["render-model.ts", "render.ts", "render-html.ts", "format.ts"]) {
      assertNoLiveLookupImports(file);
    }
    const sealed = baseDocument({
      lines: [
        {
          ...baseDocument().lines[0]!,
          description: "Sealed Classic Milk Tea",
        },
      ],
    });
    const r1 = renderFinancialDocument(sealed);
    const laterCatalogDocument = baseDocument({
      lines: [
        {
          ...baseDocument().lines[0]!,
          description: "NEW MENU NAME — Matcha Cloud",
        },
      ],
    });
    void laterCatalogDocument;
    const r2 = renderFinancialDocument(sealed);
    expect(r2.html).toBe(r1.html);
    expect(r2.html).toContain("Sealed Classic Milk Tea");
    expect(r2.html).not.toContain("Matcha Cloud");
  });

  it("FD-R16 Missing mandatory sealed rendering fact fails closed", () => {
    const missingName = baseDocument({ supplierGstLegalName: null });
    try {
      renderFinancialDocument(missingName);
      expect.unreachable("expected fail-closed render");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialDocumentError);
      expect((error as FinancialDocumentError).code).toBe("RENDERING_FAILED");
      expect((error as Error).message).not.toMatch(/UNKNOWN|TBD|N\/A/i);
    }

    const emptyNumber = baseDocument({ statutoryDocumentNumber: "   " });
    expect(() => renderFinancialDocument(emptyNumber)).toThrow(
      FinancialDocumentError,
    );

    const noLines = baseDocument({ lines: [] });
    expect(() => renderFinancialDocument(noLines)).toThrow(FinancialDocumentError);
  });

  it("FD-R17 Internal UUIDs are not unintentionally exposed in customer/print output", () => {
    const prior = priorTaxInvoice();
    const doc = creditNote();
    const { html } = renderFinancialDocument(doc, {
      priorFinancialDocument: prior,
    });
    expect(html).not.toContain(UUID_A);
    expect(html).not.toContain(UUID_B);
    expect(html).not.toContain(UUID_C);
    expect(html).not.toContain(UUID_PRIOR);
    expect(html).not.toContain(UUID_LINE);
    expect(html).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("FD-R18 Existing Slice-1/2 immutable authority surface remains unchanged", () => {
    expect([...FINANCIAL_DOCUMENT_STATUTORY_TYPES]).toEqual([
      "TAX_INVOICE",
      "BILL_OF_SUPPLY",
      "RECEIPT_VOUCHER",
      "REFUND_VOUCHER",
      "CREDIT_NOTE",
    ]);
    const doc = baseDocument();
    expect(doc.status).toBe("ISSUED");
    expect(doc.logicalIssuanceKey).toBe("fd-key-1");
    expect(doc.issuerProfileVersion).toBe(1);
    expect(doc.lines[0]!.taxableValuePaise).toBe(BigInt(10000));
  });
});

describe("IMP-028 Slice 3 prior authority correction", () => {
  it("FD-RC01 matching immutable prior authority renders prior public facts", () => {
    const c = creditNote();
    const i = priorTaxInvoice();
    const { model, html } = renderFinancialDocument(c, {
      priorFinancialDocument: i,
    });
    expect(model.priorDocument?.statutoryDocumentNumber).toBe("TI/2526/000001");
    expect(model.priorDocument?.issueDateDisplay).toBe("2025-08-14");
    expect(html).toContain("TI/2526/000001");
    expect(html).toContain("2025-08-14");
    expect(html).not.toContain(UUID_PRIOR);
  });

  it("FD-RC02 unrelated Tax Invoice is rejected", () => {
    const c = creditNote();
    const i2 = priorTaxInvoice({
      id: UUID_UNRELATED,
      statutoryDocumentNumber: "TI/2526/999999",
    });
    try {
      renderFinancialDocument(c, { priorFinancialDocument: i2 });
      expect.unreachable("expected identity mismatch rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialDocumentError);
      expect((error as FinancialDocumentError).code).toBe("RENDERING_AUTHORITY_GAP");
      expect((error as Error).message).not.toMatch(/UNKNOWN|TBD|N\/A/i);
    }
    // Ensure the unrelated number is not obtainable via a successful render path.
    const valid = renderFinancialDocument(c, {
      priorFinancialDocument: priorTaxInvoice(),
    });
    expect(valid.html).not.toContain("TI/2526/999999");
  });

  it("FD-RC03 wrong prior type is rejected", () => {
    const c = creditNote();
    const bosPrior = priorTaxInvoice({
      documentType: "BILL_OF_SUPPLY",
      statutoryDocumentNumber: "BOS/2526/000001",
    });
    expect(() =>
      renderFinancialDocument(c, { priorFinancialDocument: bosPrior }),
    ).toThrow(FinancialDocumentError);
    try {
      renderFinancialDocument(c, { priorFinancialDocument: bosPrior });
    } catch (error) {
      expect((error as FinancialDocumentError).code).toBe("RENDERING_FAILED");
    }
  });

  it("FD-RC04 missing required prior authority fails closed", () => {
    const c = creditNote();
    try {
      renderFinancialDocument(c);
      expect.unreachable("expected missing prior authority gap");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialDocumentError);
      expect((error as FinancialDocumentError).code).toBe("RENDERING_AUTHORITY_GAP");
      expect((error as Error).message).not.toMatch(/UNKNOWN|TBD|N\/A/i);
      expect((error as Error).message).not.toContain(UUID_PRIOR);
    }
  });

  it("FD-RC05 deterministic authority pair produces byte-identical output", () => {
    const c = creditNote();
    const i = priorTaxInvoice();
    const renders = Array.from({ length: 5 }, () =>
      renderFinancialDocument(c, { priorFinancialDocument: i }),
    );
    for (let idx = 1; idx < renders.length; idx += 1) {
      expect(renders[idx]!.html).toBe(renders[0]!.html);
      expect(renders[idx]!.model).toEqual(renders[0]!.model);
    }
  });

  it("FD-RC06 different prior cannot alter same document into alternate valid HTML", () => {
    const c = creditNote();
    const i1 = priorTaxInvoice();
    const i2 = priorTaxInvoice({
      id: UUID_UNRELATED,
      statutoryDocumentNumber: "TI/2526/UNREL",
    });
    const valid = renderFinancialDocument(c, { priorFinancialDocument: i1 });
    expect(valid.html).toContain("TI/2526/000001");
    expect(() =>
      renderFinancialDocument(c, { priorFinancialDocument: i2 }),
    ).toThrow(FinancialDocumentError);
  });

  it("FD-RC07 prior public reference escaping", () => {
    const c = creditNote();
    const i = priorTaxInvoice({
      statutoryDocumentNumber: 'BB/TI/<script>alert(1)</script>/"x"',
    });
    const { html } = renderFinancialDocument(c, { priorFinancialDocument: i });
    expect(html).toContain(
      "BB/TI/&lt;script&gt;alert(1)&lt;/script&gt;/&quot;x&quot;",
    );
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("FD-RC08 internal UUID still absent when identity matching uses prior id", () => {
    const c = creditNote();
    const i = priorTaxInvoice();
    const { html } = renderFinancialDocument(c, { priorFinancialDocument: i });
    expect(html).not.toContain(UUID_A);
    expect(html).not.toContain(UUID_PRIOR);
    expect(html).not.toContain(UUID_UNRELATED);
    expect(html).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });
});
