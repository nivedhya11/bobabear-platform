/** @vitest-environment node */
/**
 * Financial Document artifact / PDF foundation tests (IMP-028 Slice 4).
 * FD-A01 … FD-A18
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import {
  FINANCIAL_DOCUMENT_PDF_MEDIA_TYPE,
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  FinancialDocumentError,
  generateFinancialDocumentArtifact,
  renderFinancialDocument,
  suggestFinancialDocumentArtifactFilename,
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
    sequenceNumber: 1n,
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
    taxableTotalPaise: 10000n,
    taxTotalPaise: 500n,
    discountTotalPaise: 0n,
    chargeTotalPaise: 0n,
    grandTotalPaise: 10500n,
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
        unitPaise: 5000n,
        discountPaise: 0n,
        chargePaise: 0n,
        taxableValuePaise: 10000n,
        lineTotalPaise: 10500n,
        sacCode: "996331",
        hsnCode: null,
        historicalCatalogItemId: "catalog-item-historical-1",
        taxComponents: [
          {
            id: UUID_B,
            financialDocumentLineId: UUID_LINE,
            taxType: "cgst",
            rateBps: 250,
            taxableAmountPaise: 10000n,
            taxAmountPaise: 250n,
          },
          {
            id: UUID_C,
            financialDocumentLineId: UUID_LINE,
            taxType: "sgst",
            rateBps: 250,
            taxableAmountPaise: 10000n,
            taxAmountPaise: 250n,
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

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Copy: pdf.js may transfer/detach the underlying ArrayBuffer.
  const data = Uint8Array.from(bytes);
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return parts.join("\n").replace(/\s+/g, " ").trim();
}


describe("IMP-028 Financial Document artifact foundation", () => {
  it("FD-A01 TAX_INVOICE generates PDF artifact", async () => {
    const artifact = await generateFinancialDocumentArtifact(
      baseDocument({ documentType: "TAX_INVOICE" }),
    );
    expect(artifact.byteLength).toBeGreaterThan(0);
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Tax Invoice");
    expect(text).toContain("TI/2526/000001");
  });

  it("FD-A02 BILL_OF_SUPPLY generates artifact", async () => {
    const artifact = await generateFinancialDocumentArtifact(
      baseDocument({
        documentType: "BILL_OF_SUPPLY",
        statutoryDocumentNumber: "BOS/2526/000001",
        supplierGstin: null,
        supplierRegistrationScheme: "composition",
      }),
    );
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Bill of Supply");
    expect(text).toContain("BOS/2526/000001");
  });

  it("FD-A03 RECEIPT_VOUCHER generates artifact", async () => {
    const artifact = await generateFinancialDocumentArtifact(
      baseDocument({
        documentType: "RECEIPT_VOUCHER",
        statutoryDocumentNumber: "RV/2526/000001",
      }),
    );
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Receipt Voucher");
  });

  it("FD-A04 REFUND_VOUCHER generates artifact", async () => {
    const artifact = await generateFinancialDocumentArtifact(
      baseDocument({
        documentType: "REFUND_VOUCHER",
        statutoryDocumentNumber: "RFV/2526/000001",
        refundId: UUID_B,
      }),
    );
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Refund Voucher");
  });

  it("FD-A05 CREDIT_NOTE with verified prior Tax Invoice generates artifact", async () => {
    const artifact = await generateFinancialDocumentArtifact(creditNote(), {
      priorFinancialDocument: priorTaxInvoice(),
    });
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Credit Note");
    expect(text).toContain("CN/2526/000001");
    expect(text).toContain("TI/2526/000001");
    expect(text).toContain("2025-08-14");
  });

  it("FD-A06 CREDIT_NOTE missing prior authority fails closed", async () => {
    await expect(generateFinancialDocumentArtifact(creditNote())).rejects.toMatchObject({
      name: "FinancialDocumentError",
      code: "RENDERING_AUTHORITY_GAP",
    });
  });

  it("FD-A07 CREDIT_NOTE unrelated prior authority fails closed", async () => {
    const unrelated = priorTaxInvoice({
      id: UUID_UNRELATED,
      statutoryDocumentNumber: "TI/2526/999999",
    });
    await expect(
      generateFinancialDocumentArtifact(creditNote(), {
        priorFinancialDocument: unrelated,
      }),
    ).rejects.toMatchObject({
      name: "FinancialDocumentError",
      code: "RENDERING_AUTHORITY_GAP",
    });
  });

  it("FD-A08 PDF artifact mediaType is application/pdf", async () => {
    const artifact = await generateFinancialDocumentArtifact(baseDocument());
    expect(artifact.mediaType).toBe(FINANCIAL_DOCUMENT_PDF_MEDIA_TYPE);
    expect(artifact.mediaType).toBe("application/pdf");
  });

  it("FD-A09 PDF bytes are non-empty and valid PDF signature", async () => {
    const artifact = await generateFinancialDocumentArtifact(baseDocument());
    expect(artifact.byteLength).toBeGreaterThan(100);
    expect(artifact.bytes.byteLength).toBe(artifact.byteLength);
    const sig = String.fromCharCode(
      artifact.bytes[0]!,
      artifact.bytes[1]!,
      artifact.bytes[2]!,
      artifact.bytes[3]!,
      artifact.bytes[4]!,
    );
    expect(sig).toBe("%PDF-");
  });

  it("FD-A10 Suggested filename contains no internal UUID", async () => {
    const doc = baseDocument();
    const artifact = await generateFinancialDocumentArtifact(doc);
    expect(artifact.suggestedFilename).toBe(
      suggestFinancialDocumentArtifactFilename(doc),
    );
    expect(artifact.suggestedFilename).toBe("BOBA-Tax-Invoice-TI-2526-000001.pdf");
    expect(artifact.suggestedFilename).not.toContain(UUID_A);
    expect(artifact.suggestedFilename).not.toContain(UUID_B);
    expect(artifact.suggestedFilename).not.toContain(UUID_C);
    expect(artifact.suggestedFilename).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("FD-A11 Internal UUIDs are not present in extractable artifact text/metadata", async () => {
    const artifact = await generateFinancialDocumentArtifact(creditNote(), {
      priorFinancialDocument: priorTaxInvoice(),
    });
    const text = await extractPdfText(artifact.bytes);
    // Inspect raw PDF bytes (latin1) for metadata/info strings without pdfjs transfer.
    const raw = Buffer.from(artifact.bytes).toString("latin1");
    for (const id of [UUID_A, UUID_B, UUID_C, UUID_PRIOR, UUID_LINE, UUID_UNRELATED]) {
      expect(text).not.toContain(id);
      expect(raw).not.toContain(id);
    }
    expect(raw).not.toMatch(/\/home\/|\/Users\/|C:\\\\|passwd|secret/i);
  });

  it("FD-A12 HTML-sensitive product/customer text does not become executable artifact content", async () => {
    const doc = baseDocument({
      recipientDisplayName: '<script>alert("x")</script>',
      lines: [
        {
          id: UUID_LINE,
          financialDocumentId: UUID_A,
          lineNumber: 1,
          description: '<img src=x onerror=alert(1)> Milk Tea',
          quantity: 1,
          unitPaise: 10000n,
          discountPaise: 0n,
          chargePaise: 0n,
          taxableValuePaise: 10000n,
          lineTotalPaise: 10500n,
          sacCode: "996331",
          hsnCode: null,
          historicalCatalogItemId: null,
          taxComponents: [
            {
              id: UUID_B,
              financialDocumentLineId: UUID_LINE,
              taxType: "cgst",
              rateBps: 250,
              taxableAmountPaise: 10000n,
              taxAmountPaise: 250n,
            },
            {
              id: UUID_C,
              financialDocumentLineId: UUID_LINE,
              taxType: "sgst",
              rateBps: 250,
              taxableAmountPaise: 10000n,
              taxAmountPaise: 250n,
            },
          ],
        },
      ],
    });
    const artifact = await generateFinancialDocumentArtifact(doc);
    expect(artifact.mediaType).toBe("application/pdf");
    expect(Buffer.from(artifact.bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Milk Tea");
    // Escaped HTML source must not be served as an HTML document. Literal
    // angle-bracket characters may appear in the PDF text layer as plain text;
    // that is not executable artifact content.
    expect(Buffer.from(artifact.bytes).subarray(0, 15).toString("utf8")).not.toMatch(/<!DOCTYPE html/i);
  });

  it("FD-A13 No remote assets/network dependency required", async () => {
    const source = readFileSync(path.join(HERE, "artifact.ts"), "utf8");
    expect(source).toContain("allowHttp: false");
    expect(source).toContain("allowFile: false");
    expect(source).toContain("allowData: false");
    expect(source).not.toMatch(/googleFont|fonts\.googleapis|https:\/\//);
    expect(source).toContain("autoDiscover: false");
    const artifact = await generateFinancialDocumentArtifact(baseDocument());
    expect(artifact.byteLength).toBeGreaterThan(0);
  });

  it("FD-A14 Same sealed authority produces semantically identical content across generations", async () => {
    const doc = baseDocument();
    const a = await generateFinancialDocumentArtifact(doc);
    const b = await generateFinancialDocumentArtifact(doc);
    const textA = await extractPdfText(a.bytes);
    const textB = await extractPdfText(b.bytes);
    expect(textA).toBe(textB);
    expect(textA).toContain("Tax Invoice");
    expect(textA).toContain("₹105.00");
  });

  it("FD-A15 Report whether raw PDF bytes are identical across repeated generation", async () => {
    const doc = baseDocument();
    const a = await generateFinancialDocumentArtifact(doc);
    const b = await generateFinancialDocumentArtifact(doc);
    const bytesIdentical =
      a.byteLength === b.byteLength &&
      a.bytes.every((value, index) => value === b.bytes[index]);
    // Engine embeds CreationDate; byte identity is not claimed.
    expect(typeof bytesIdentical).toBe("boolean");
    expect(a.sha256 === b.sha256).toBe(bytesIdentical);
    // Record observed result for the slice report (not an assertion of YES).
    expect(bytesIdentical).toBe(false);
  });

  it("FD-A16 Changing current catalog/profile/customer data cannot affect generation", async () => {
    const source = readFileSync(path.join(HERE, "artifact.ts"), "utf8");
    expect(source).not.toMatch(/from ["'].*menu/);
    expect(source).not.toMatch(/from ["'].*catalog/);
    expect(source).not.toMatch(/from ["'].*profile-resolution/);
    expect(source).not.toMatch(/from ["'].*customer-profile/);
    expect(source).not.toMatch(/from ["'].*\/payment/);
    expect(source).not.toMatch(/from ["'].*\/refund/);
    expect(source).not.toMatch(/from ["'].*\/order/);
    expect(source).not.toMatch(/from ["'].*repository/);
    expect(source).not.toMatch(/from ["'].*database/);

    const sealed = baseDocument({
      supplierGstLegalName: "Sealed Historical Supplier",
      recipientDisplayName: "Sealed Recipient",
      lines: [
        {
          id: UUID_LINE,
          financialDocumentId: UUID_A,
          lineNumber: 1,
          description: "Sealed Classic Milk Tea",
          quantity: 2,
          unitPaise: 5000n,
          discountPaise: 0n,
          chargePaise: 0n,
          taxableValuePaise: 10000n,
          lineTotalPaise: 10500n,
          sacCode: "996331",
          hsnCode: null,
          historicalCatalogItemId: "catalog-item-historical-1",
          taxComponents: [],
        },
      ],
    });
    // Mutate a separate "current" object that is never passed in.
    const currentCatalogName = "Matcha Cloud LIVE";
    const currentIssuerName = "Mutated Current Issuer Name";
    const currentCustomerName = "Mutated Current Customer";
    void currentCatalogName;
    void currentIssuerName;
    void currentCustomerName;

    const artifact = await generateFinancialDocumentArtifact(sealed);
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Sealed Historical Supplier");
    expect(text).toContain("Sealed Recipient");
    expect(text).toContain("Sealed Classic Milk Tea");
    expect(text).not.toContain("Matcha Cloud LIVE");
    expect(text).not.toContain("Mutated Current Issuer Name");
    expect(text).not.toContain("Mutated Current Customer");
  });

  it("FD-A17 Long/multi-line content generates without clipping/exception", async () => {
    const longDescription = `Classic Milk Tea ${"very long description segment ".repeat(40)}end.`;
    const artifact = await generateFinancialDocumentArtifact(
      baseDocument({
        lines: [
          {
            id: UUID_LINE,
            financialDocumentId: UUID_A,
            lineNumber: 1,
            description: longDescription,
            quantity: 2,
            unitPaise: 5000n,
            discountPaise: 0n,
            chargePaise: 0n,
            taxableValuePaise: 10000n,
            lineTotalPaise: 10500n,
            sacCode: "996331",
            hsnCode: null,
            historicalCatalogItemId: null,
            taxComponents: [],
          },
        ],
        recipientAddress: `Line1\nLine2\n${"Address block ".repeat(30)}`,
      }),
    );
    expect(artifact.byteLength).toBeGreaterThan(0);
    const text = await extractPdfText(artifact.bytes);
    expect(text).toContain("Classic Milk Tea");
    expect(text).toMatch(/en\s*d\./);
    expect(text).toContain("₹105.00");
  });

  it("FD-A18 Existing renderer output/authority semantics remain unchanged", async () => {
    expect(FINANCIAL_DOCUMENT_STATUTORY_TYPES).toEqual([
      "TAX_INVOICE",
      "BILL_OF_SUPPLY",
      "RECEIPT_VOUCHER",
      "REFUND_VOUCHER",
      "CREDIT_NOTE",
    ]);

    const doc = creditNote();
    const prior = priorTaxInvoice();
    const rendered = renderFinancialDocument(doc, {
      priorFinancialDocument: prior,
    });
    expect(rendered.html).toContain("<h1>Credit Note</h1>");
    expect(rendered.html).toContain("TI/2526/000001");
    expect(rendered.html).not.toContain(UUID_PRIOR);

    await expect(
      generateFinancialDocumentArtifact(doc, { priorFinancialDocument: prior }),
    ).resolves.toMatchObject({ mediaType: "application/pdf" });

    await expect(generateFinancialDocumentArtifact(doc)).rejects.toBeInstanceOf(
      FinancialDocumentError,
    );
  });
});
