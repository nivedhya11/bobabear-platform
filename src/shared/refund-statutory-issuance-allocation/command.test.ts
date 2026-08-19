import { describe, expect, it } from "vitest";

import {
  canonicalizeIssuanceAllocationAuthority,
  issuanceAllocationAuthorityEquals,
} from "./canonical";
import { parsePositivePaise, parseSealRefundStatutoryIssuanceAllocationCommand } from "./command";
import { RefundStatutoryIssuanceAllocationError } from "./errors";

const DECISION_ID = "11111111-1111-4111-8111-111111111111";
const LINE_A = "22222222-2222-4222-8222-222222222222";
const LINE_B = "33333333-3333-4333-8333-333333333333";
const TAX_A = "44444444-4444-4444-8444-444444444444";
const TAX_B = "55555555-5555-4555-8555-555555555555";
const SOURCE_ID = "66666666-6666-4666-8666-666666666666";

describe("D-366 Slice 3A issuance-allocation command parsing", () => {
  it("parses explicit line and tax-component amounts as integer paise", () => {
    const parsed = parseSealRefundStatutoryIssuanceAllocationCommand({
      decisionId: DECISION_ID,
      lines: [
        {
          sourceFinancialDocumentLineId: LINE_B,
          allocatedTaxableOrBaseAmountPaise: BigInt(80),
        },
        {
          sourceFinancialDocumentLineId: LINE_A,
          allocatedTaxableOrBaseAmountPaise: "20",
        },
      ],
      taxComponents: [
        {
          sourceFinancialDocumentTaxComponentId: TAX_B,
          allocatedTaxAmountPaise: 5,
        },
        {
          sourceFinancialDocumentTaxComponentId: TAX_A,
          allocatedTaxAmountPaise: BigInt(15),
          taxType: "cgst",
          taxRateBps: 250,
        },
      ],
    });
    expect(parsed.decisionId).toBe(DECISION_ID);
    expect(parsed.lines.map((line) => line.sourceFinancialDocumentLineId)).toEqual([
      LINE_A,
      LINE_B,
    ]);
    expect(parsed.lines[0]?.allocatedTaxableOrBaseAmountPaise).toBe(BigInt(20));
    expect(parsed.taxComponents.map((tax) => tax.sourceFinancialDocumentTaxComponentId)).toEqual([
      TAX_A,
      TAX_B,
    ]);
  });

  it("rejects zero, negative, and non-integer amounts without floating point", () => {
    expect(() => parsePositivePaise(0, "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(() => parsePositivePaise(BigInt(0), "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(() => parsePositivePaise(-1, "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(() => parsePositivePaise(-1n, "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(() => parsePositivePaise(1.5, "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(() => parsePositivePaise("01", "amount")).toThrow(
      RefundStatutoryIssuanceAllocationError,
    );
    expect(parsePositivePaise(1, "amount")).toBe(1n);
    expect(1n + 2n).toBe(3n);
  });

  it("rejects duplicate source line and tax-component references", () => {
    expect(() =>
      parseSealRefundStatutoryIssuanceAllocationCommand({
        decisionId: DECISION_ID,
        lines: [
          {
            sourceFinancialDocumentLineId: LINE_A,
            allocatedTaxableOrBaseAmountPaise: 10,
          },
          {
            sourceFinancialDocumentLineId: LINE_A,
            allocatedTaxableOrBaseAmountPaise: 20,
          },
        ],
      }),
    ).toThrow(RefundStatutoryIssuanceAllocationError);
    expect(() =>
      parseSealRefundStatutoryIssuanceAllocationCommand({
        decisionId: DECISION_ID,
        taxComponents: [
          {
            sourceFinancialDocumentTaxComponentId: TAX_A,
            allocatedTaxAmountPaise: 10,
          },
          {
            sourceFinancialDocumentTaxComponentId: TAX_A,
            allocatedTaxAmountPaise: 5,
          },
        ],
      }),
    ).toThrow(RefundStatutoryIssuanceAllocationError);
  });

  it("rejects empty allocation", () => {
    expect(() =>
      parseSealRefundStatutoryIssuanceAllocationCommand({
        decisionId: DECISION_ID,
        lines: [],
        taxComponents: [],
      }),
    ).toThrow(RefundStatutoryIssuanceAllocationError);
  });

  it("exposes CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE as a distinct domain error", () => {
    const error = new RefundStatutoryIssuanceAllocationError(
      "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
      "unknown component consumption is not zero consumption",
      { field: "decisionId" },
    );
    expect(error.code).toBe("CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE");
    expect(error.code).not.toBe("REFUND_STATUTORY_ISSUANCE_ALLOCATION_INVALID_INPUT");
    expect(error.toSafeJSON()).toEqual({
      code: "CUMULATIVE_COMPONENT_AUTHORITY_INCOMPLETE",
      message: "unknown component consumption is not zero consumption",
      field: "decisionId",
    });
  });
});

describe("canonical issuance-allocation equality", () => {
  it("treats reordered equivalent sets as identical", () => {
    const left = canonicalizeIssuanceAllocationAuthority({
      refundStatutoryDecisionId: DECISION_ID,
      sourceFinancialDocumentId: SOURCE_ID,
      sourceDocumentType: "RECEIPT_VOUCHER",
      sealedReversalAmountPaise: 100n,
      lines: [
        {
          sourceFinancialDocumentLineId: LINE_B,
          allocatedTaxableOrBaseAmountPaise: 80n,
        },
        {
          sourceFinancialDocumentLineId: LINE_A,
          allocatedTaxableOrBaseAmountPaise: 10n,
        },
      ],
      taxComponents: [
        {
          sourceFinancialDocumentTaxComponentId: TAX_B,
          sourceFinancialDocumentLineId: LINE_A,
          taxType: "sgst",
          taxRateBps: 250,
          allocatedTaxAmountPaise: 5n,
        },
        {
          sourceFinancialDocumentTaxComponentId: TAX_A,
          sourceFinancialDocumentLineId: LINE_A,
          taxType: "cgst",
          taxRateBps: 250,
          allocatedTaxAmountPaise: 5n,
        },
      ],
    });
    const right = canonicalizeIssuanceAllocationAuthority({
      refundStatutoryDecisionId: DECISION_ID,
      sourceFinancialDocumentId: SOURCE_ID,
      sourceDocumentType: "RECEIPT_VOUCHER",
      sealedReversalAmountPaise: 100n,
      lines: [
        {
          sourceFinancialDocumentLineId: LINE_A,
          allocatedTaxableOrBaseAmountPaise: 10n,
        },
        {
          sourceFinancialDocumentLineId: LINE_B,
          allocatedTaxableOrBaseAmountPaise: 80n,
        },
      ],
      taxComponents: [
        {
          sourceFinancialDocumentTaxComponentId: TAX_A,
          sourceFinancialDocumentLineId: LINE_A,
          taxType: "cgst",
          taxRateBps: 250,
          allocatedTaxAmountPaise: 5n,
        },
        {
          sourceFinancialDocumentTaxComponentId: TAX_B,
          sourceFinancialDocumentLineId: LINE_A,
          taxType: "sgst",
          taxRateBps: 250,
          allocatedTaxAmountPaise: 5n,
        },
      ],
    });
    expect(issuanceAllocationAuthorityEquals(left, right)).toBe(true);
  });

  it("detects changed base or tax allocation as conflict", () => {
    const base = {
      refundStatutoryDecisionId: DECISION_ID,
      sourceFinancialDocumentId: SOURCE_ID,
      sourceDocumentType: "TAX_INVOICE" as const,
      sealedReversalAmountPaise: 100n,
      lines: [
        {
          sourceFinancialDocumentLineId: LINE_A,
          allocatedTaxableOrBaseAmountPaise: 80n,
        },
      ],
      taxComponents: [
        {
          sourceFinancialDocumentTaxComponentId: TAX_A,
          sourceFinancialDocumentLineId: LINE_A,
          taxType: "cgst",
          taxRateBps: 250,
          allocatedTaxAmountPaise: 20n,
        },
      ],
    };
    expect(
      issuanceAllocationAuthorityEquals(base, {
        ...base,
        lines: [
          {
            sourceFinancialDocumentLineId: LINE_A,
            allocatedTaxableOrBaseAmountPaise: 70n,
          },
        ],
      }),
    ).toBe(false);
    expect(
      issuanceAllocationAuthorityEquals(base, {
        ...base,
        taxComponents: [
          {
            sourceFinancialDocumentTaxComponentId: TAX_A,
            sourceFinancialDocumentLineId: LINE_A,
            taxType: "cgst",
            taxRateBps: 250,
            allocatedTaxAmountPaise: 10n,
          },
        ],
      }),
    ).toBe(false);
  });
});
