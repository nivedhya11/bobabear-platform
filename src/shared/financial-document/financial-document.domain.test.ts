/**
 * Financial Document domain tests (FD-P01, FD-P02, FD-P13, FD-P14).
 */
import { describe, expect, it } from "vitest";

import {
  BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED,
  FINANCIAL_DOCUMENT_STATUTORY_TYPES,
  FinancialDocumentError,
  SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE,
  assertCreditNotePriorLinkage,
  assertFinancialDocumentStatutoryType,
  formatStatutoryDocumentNumber,
  isFinancialDocumentStatutoryType,
} from "./index";

describe("IMP-028 Financial Document domain", () => {
  it("FD-P01 accepts only locked statutory types", () => {
    expect([...FINANCIAL_DOCUMENT_STATUTORY_TYPES]).toEqual([
      "TAX_INVOICE",
      "BILL_OF_SUPPLY",
      "RECEIPT_VOUCHER",
      "REFUND_VOUCHER",
      "CREDIT_NOTE",
    ]);
    for (const type of FINANCIAL_DOCUMENT_STATUTORY_TYPES) {
      expect(isFinancialDocumentStatutoryType(type)).toBe(true);
      expect(assertFinancialDocumentStatutoryType(type)).toBe(type);
    }
    expect(() => assertFinancialDocumentStatutoryType("INVOICE")).toThrow(
      FinancialDocumentError,
    );
  });

  it("FD-P02 rejects TAX_RECEIPT as a statutory type", () => {
    expect(isFinancialDocumentStatutoryType("TAX_RECEIPT")).toBe(false);
    try {
      assertFinancialDocumentStatutoryType("TAX_RECEIPT");
      expect.unreachable("expected TAX_RECEIPT rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialDocumentError);
      expect((error as FinancialDocumentError).code).toBe("TAX_RECEIPT_FORBIDDEN");
    }
  });

  it("FD-P13 CREDIT_NOTE linkage requires prior TAX_INVOICE identity", () => {
    expect(SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE).toBe(true);
    expect(() =>
      assertCreditNotePriorLinkage({
        documentType: "CREDIT_NOTE",
        priorFinancialDocumentId: "fd-prior",
        priorDocumentType: "TAX_INVOICE",
      }),
    ).not.toThrow();
    expect(() =>
      assertCreditNotePriorLinkage({
        documentType: "CREDIT_NOTE",
        priorFinancialDocumentId: null,
        priorDocumentType: null,
      }),
    ).toThrow(/prior Financial Document/i);
    expect(() =>
      assertCreditNotePriorLinkage({
        documentType: "CREDIT_NOTE",
        priorFinancialDocumentId: "fd-prior",
        priorDocumentType: "RECEIPT_VOUCHER",
      }),
    ).toThrow(FinancialDocumentError);
  });

  it("FD-P14 does not introduce BoS-only automatic Credit Note", () => {
    expect(BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED).toBe(true);
    expect(() =>
      assertCreditNotePriorLinkage({
        documentType: "CREDIT_NOTE",
        priorFinancialDocumentId: "fd-bos",
        priorDocumentType: "BILL_OF_SUPPLY",
      }),
    ).toThrow(/Bill of Supply/i);
    // Non-credit documents do not require prior linkage.
    expect(() =>
      assertCreditNotePriorLinkage({
        documentType: "BILL_OF_SUPPLY",
        priorFinancialDocumentId: null,
        priorDocumentType: null,
      }),
    ).not.toThrow();
  });

  it("formats statutory numbers from series prefix + sequence (not ORD-* / provider ids)", () => {
    expect(formatStatutoryDocumentNumber("TI/2526/", 1n)).toBe("TI/2526/000001");
    expect(formatStatutoryDocumentNumber("TI/2526/", 42n)).not.toMatch(/^ORD-/);
    expect(formatStatutoryDocumentNumber("TI/2526/", 1n).length).toBeLessThanOrEqual(16);
  });

  it("rejects statutory numbers exceeding 16 characters without truncation", () => {
    expect(() => formatStatutoryDocumentNumber("BB/TI/2526/", 1n)).toThrow(
      FinancialDocumentError,
    );
    try {
      formatStatutoryDocumentNumber("TOOLONGPRE/", 1n);
      expect.unreachable("expected length rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialDocumentError);
      expect((error as FinancialDocumentError).code).toBe("STATUTORY_NUMBER_INVALID");
    }
  });
});
