import { describe, expect, it } from "vitest";

import { RefundStatutoryDecisionError } from "./errors";
import {
  canonicalAllocationAuthorityJson,
  isAbsenceOnlyNoStatutoryDocumentRationale,
  parseFinalizeRefundStatutoryDecisionCommand,
  parseNoStatutoryDocumentReasonCode,
  parseSection34QualificationCode,
  parseSection34QualificationFacts,
} from "./finalization-command";
import { sealedBranchAuthorityEquals } from "./canonical";

const DECISION_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "22222222-2222-4222-8222-222222222222";
const RV_ID = "33333333-3333-4333-8333-333333333333";
const TI_ID = "44444444-4444-4444-8444-444444444444";
const REFUND_ID = "55555555-5555-4555-8555-555555555555";
const PAYMENT_ID = "66666666-6666-4666-8666-666666666666";

describe("D-366 finalization command parsing", () => {
  it("parses structured RFV PARTIAL allocation", () => {
    const parsed = parseFinalizeRefundStatutoryDecisionCommand({
      decisionId: DECISION_ID,
      actorKind: "workforce",
      actorId: ACTOR_ID,
      now: new Date("2026-08-17T12:00:00.000Z"),
      disposition: "REFUND_VOUCHER",
      priorReceiptVoucherId: RV_ID,
      noSupplyAuthorityKind: "ORDER_CANCELLED",
      reversalScope: "PARTIAL",
      allocationAuthority: {
        sourceFinancialDocumentId: RV_ID,
        allocatedAmountPaise: BigInt(100),
      },
    });
    expect(parsed.disposition).toBe("REFUND_VOUCHER");
    if (parsed.disposition !== "REFUND_VOUCHER") return;
    expect(parsed.allocationAuthority?.allocatedAmountPaise).toBe(BigInt(100));
    expect(
      canonicalAllocationAuthorityJson(parsed.allocationAuthority!),
    ).toBe(
      JSON.stringify({
        allocatedAmountPaise: "100",
        sourceFinancialDocumentId: RV_ID,
      }),
    );
  });

  it("accepts only canonical Section 34 qualification codes", () => {
    expect(parseSection34QualificationCode("TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE")).toBe(
      "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
    );
    expect(parseSection34QualificationCode("GOODS_RETURNED_BY_RECIPIENT")).toBe(
      "GOODS_RETURNED_BY_RECIPIENT",
    );
    expect(parseSection34QualificationCode("GOODS_OR_SERVICES_DEFICIENT")).toBe(
      "GOODS_OR_SERVICES_DEFICIENT",
    );
    expect(() => parseSection34QualificationCode("true")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(() => parseSection34QualificationCode("OTHER")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(() => parseSection34QualificationCode("CUSTOMER_REFUND")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(() => parseSection34QualificationCode("")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(() =>
      parseSection34QualificationFacts({ qualified: true }, TI_ID),
    ).toThrow(RefundStatutoryDecisionError);
    const facts = parseSection34QualificationFacts(
      { priorTaxInvoiceId: TI_ID, note: "operator structured facts" },
      TI_ID,
    );
    expect(facts.priorTaxInvoiceId).toBe(TI_ID);
  });

  it("requires bounded NSD reason and TI citation in durable facts", () => {
    expect(
      parseNoStatutoryDocumentReasonCode(
        "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
      ),
    ).toBe("COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT");
    expect(() => parseNoStatutoryDocumentReasonCode("OTHER")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(() => parseNoStatutoryDocumentReasonCode("")).toThrow(
      RefundStatutoryDecisionError,
    );
    expect(
      isAbsenceOnlyNoStatutoryDocumentRationale(
        "No matching RFV/CN evidence was found",
      ),
    ).toBe(true);
    expect(() =>
      parseFinalizeRefundStatutoryDecisionCommand({
        decisionId: DECISION_ID,
        actorKind: "workforce",
        actorId: ACTOR_ID,
        now: new Date(),
        disposition: "NO_STATUTORY_DOCUMENT",
        priorTaxInvoiceId: TI_ID,
        noStatutoryDocumentReasonCode:
          "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
        noStatutoryDocumentRationale: "no Tax Invoice exists",
        referencedCommercialFactRefs: [
          { kind: "refund", id: REFUND_ID },
          { kind: "payment", id: PAYMENT_ID },
          { kind: "financial_document", id: TI_ID },
        ],
      }),
    ).toThrow(RefundStatutoryDecisionError);
    expect(() =>
      parseFinalizeRefundStatutoryDecisionCommand({
        decisionId: DECISION_ID,
        actorKind: "workforce",
        actorId: ACTOR_ID,
        now: new Date(),
        disposition: "NO_STATUTORY_DOCUMENT",
        priorTaxInvoiceId: TI_ID,
        noStatutoryDocumentReasonCode:
          "COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT",
        noStatutoryDocumentRationale:
          "Operator cites processed refund and payment as goodwill commercial adjustment outside RFV/CN.",
        referencedCommercialFactRefs: [
          { kind: "refund", id: REFUND_ID },
          { kind: "payment", id: PAYMENT_ID },
        ],
      }),
    ).toThrow(RefundStatutoryDecisionError);
  });

  it("compares sealed authority without actor/clock metadata", () => {
    const a = {
      disposition: "CREDIT_NOTE" as const,
      sealedPriorReceiptVoucherId: null,
      sealedPriorTaxInvoiceId: TI_ID,
      sealedSection34QualificationCode: "TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE",
      sealedSection34QualificationFacts: JSON.stringify({
        priorTaxInvoiceId: TI_ID,
      }),
      sealedReversalScope: "FULL" as const,
      sealedReversalAmountPaise: BigInt(100),
      sealedAllocationAuthority: null,
      sealedNoSupplyAuthorityKind: null,
      sealedNoStatutoryDocumentReasonCode: null,
      sealedNoStatutoryDocumentRationale: null,
      sealedReferencedCommercialFactRefs: "[]",
    };
    expect(sealedBranchAuthorityEquals(a, { ...a })).toBe(true);
    expect(
      sealedBranchAuthorityEquals(a, {
        ...a,
        sealedReversalAmountPaise: BigInt(99),
      }),
    ).toBe(false);
    expect(
      sealedBranchAuthorityEquals(a, {
        ...a,
        sealedSection34QualificationCode: "GOODS_RETURNED_BY_RECIPIENT",
      }),
    ).toBe(false);
  });
});
