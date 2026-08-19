import { describe, expect, it } from "vitest";

import {
  financialDocumentCustomerTitle,
  financialDocumentDownloadAccessibleName,
  formatFinancialDocumentIssuedAt,
} from "./financial-document-presentation";

describe("financial-document-presentation", () => {
  it("FD-UI01/06/07/08/09 maps statutory types to customer titles", () => {
    expect(financialDocumentCustomerTitle("TAX_INVOICE")).toBe("Tax Invoice");
    expect(financialDocumentCustomerTitle("CREDIT_NOTE")).toBe("Credit Note");
    expect(financialDocumentCustomerTitle("BILL_OF_SUPPLY")).toBe("Bill of Supply");
    expect(financialDocumentCustomerTitle("RECEIPT_VOUCHER")).toBe("Receipt Voucher");
    expect(financialDocumentCustomerTitle("REFUND_VOUCHER")).toBe("Refund Voucher");
  });

  it("FD-UI10 never produces a Tax Receipt customer label", () => {
    expect(financialDocumentCustomerTitle("TAX_RECEIPT")).not.toBe("Tax Receipt");
    expect(financialDocumentCustomerTitle("TAX_INVOICE")).not.toBe("Tax Receipt");
    expect(financialDocumentDownloadAccessibleName("TAX_INVOICE", "TI/2526/000001")).not.toMatch(
      /Tax Receipt/i,
    );
  });

  it("FD-UI17 download accessible names include the document title", () => {
    expect(
      financialDocumentDownloadAccessibleName("TAX_INVOICE", "TI/2526/000001"),
    ).toBe("Download Tax Invoice PDF TI/2526/000001");
    expect(
      financialDocumentDownloadAccessibleName("CREDIT_NOTE", "CN/2526/000004"),
    ).toBe("Download Credit Note PDF CN/2526/000004");
  });

  it("formats issued-at as presentation-only text", () => {
    const text = formatFinancialDocumentIssuedAt("2026-08-15T10:00:00.000Z");
    expect(text.startsWith("Issued ")).toBe(true);
  });
});
