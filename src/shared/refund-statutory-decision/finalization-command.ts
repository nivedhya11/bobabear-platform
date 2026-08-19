/**
 * Operator-assisted RefundStatutoryDecision finalization command
 * (IMP-028 / D-366 Slice 2).
 *
 * Bounded Section-34 qualification codes and NSD reason vocabulary only.
 * Structured operator authority is validated and sealed, or the operation
 * fails closed.
 */
import {
  REFUND_STATUTORY_COMMERCIAL_FACT_REF_KINDS,
  REFUND_STATUTORY_NO_STATUTORY_DOCUMENT_REASON_CODES,
  REFUND_STATUTORY_NO_SUPPLY_AUTHORITY_KINDS,
  REFUND_STATUTORY_REVERSAL_SCOPES,
  REFUND_STATUTORY_SECTION34_QUALIFICATION_CODES,
  type RefundStatutoryCommercialFactRefKind,
  type RefundStatutoryDisposition,
  type RefundStatutoryNoStatutoryDocumentReasonCode,
  type RefundStatutoryNoSupplyAuthorityKind,
  type RefundStatutoryReversalScope,
  type RefundStatutorySection34QualificationCode,
} from "./constants";
import { RefundStatutoryDecisionError } from "./errors";
import { assertRefundStatutoryUuid } from "./logical-key";
import { canonicalJson } from "./canonical";

const BOOLEAN_LIKE = new Set([
  "true",
  "false",
  "yes",
  "no",
  "1",
  "0",
  "qualified",
  "unqualified",
]);

const ABSENCE_ONLY_NSD_SUBSTRINGS = [
  "no tax invoice",
  "no matching",
  "not found",
  "missing evidence",
  "insufficient evidence",
  "numbering unavailable",
  "numbering is unavailable",
  "recovery failed",
  "document type is disabled",
  "document type disabled",
  "configuration is absent",
  "configuration absent",
  "profile is absent",
  "profile absent",
  "no section-34",
  "no section 34",
  "no receipt voucher",
  "no credit note",
  "no statutory evidence",
  "absence of",
] as const;

export type RefundStatutoryCommercialFactRef = Readonly<{
  kind: RefundStatutoryCommercialFactRefKind;
  id: string;
}>;

export type ExplicitReversalAllocationAuthority = Readonly<{
  sourceFinancialDocumentId: string;
  allocatedAmountPaise: bigint;
}>;

export type FinalizeRefundStatutoryDecisionCommand = Readonly<{
  decisionId: string;
  actorKind: string;
  actorId: string;
  now: Date;
  disposition: RefundStatutoryDisposition;
  priorReceiptVoucherId?: string | null;
  priorTaxInvoiceId?: string | null;
  noSupplyAuthorityKind?: RefundStatutoryNoSupplyAuthorityKind | null;
  section34QualificationCode?: string | null;
  section34QualificationFacts?: Readonly<Record<string, unknown>> | null;
  reversalScope?: RefundStatutoryReversalScope | null;
  allocationAuthority?: ExplicitReversalAllocationAuthority | null;
  noStatutoryDocumentReasonCode?: string | null;
  noStatutoryDocumentRationale?: string | null;
  referencedCommercialFactRefs?: readonly RefundStatutoryCommercialFactRef[] | null;
}>;

export type ParsedFinalizeRefundStatutoryDecisionCommand = Readonly<{
  decisionId: string;
  actorKind: string;
  actorId: string;
  now: Date;
}> &
  (
    | Readonly<{
        disposition: "REFUND_VOUCHER";
        priorReceiptVoucherId: string;
        noSupplyAuthorityKind: "ORDER_CANCELLED";
        reversalScope: RefundStatutoryReversalScope;
        allocationAuthority: ExplicitReversalAllocationAuthority | null;
      }>
    | Readonly<{
        disposition: "CREDIT_NOTE";
        priorTaxInvoiceId: string;
        section34QualificationCode: RefundStatutorySection34QualificationCode;
        section34QualificationFacts: Readonly<Record<string, unknown>>;
        reversalScope: RefundStatutoryReversalScope;
        allocationAuthority: ExplicitReversalAllocationAuthority | null;
      }>
    | Readonly<{
        disposition: "NO_STATUTORY_DOCUMENT";
        priorTaxInvoiceId: string;
        noStatutoryDocumentReasonCode: RefundStatutoryNoStatutoryDocumentReasonCode;
        noStatutoryDocumentRationale: string;
        referencedCommercialFactRefs: readonly RefundStatutoryCommercialFactRef[];
      }>
  );

function invalid(message: string, field: string): never {
  throw new RefundStatutoryDecisionError(
    "REFUND_STATUTORY_DECISION_INVALID_INPUT",
    message,
    { field },
  );
}

function requireNonEmptyText(value: string | null | undefined, field: string): string {
  if (typeof value !== "string") {
    invalid(`${field} is required.`, field);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    invalid(`${field} must be non-empty.`, field);
  }
  return trimmed;
}

function requireDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    invalid(`${field} must be a Date.`, field);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAllocatedAmountPaise(
  value: unknown,
  field = "allocationAuthority.allocatedAmountPaise",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      invalid("allocatedAmountPaise must be a positive integer.", field);
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^[1-9][0-9]*$/.test(value.trim())) {
    return BigInt(value.trim());
  }
  invalid("allocatedAmountPaise must be a positive integer.", field);
}

export function parseExplicitAllocationAuthority(
  value: ExplicitReversalAllocationAuthority | null | undefined,
  reversalScope: RefundStatutoryReversalScope,
): ExplicitReversalAllocationAuthority | null {
  if (reversalScope === "FULL") {
    if (value != null) {
      invalid(
        "FULL reversal must not include allocation authority.",
        "allocationAuthority",
      );
    }
    return null;
  }
  if (value == null) {
    invalid(
      "PARTIAL reversal requires explicit write-once allocation authority.",
      "allocationAuthority",
    );
  }
  if (!isPlainObject(value)) {
    invalid("allocationAuthority must be a structured object.", "allocationAuthority");
  }
  const sourceFinancialDocumentId = assertRefundStatutoryUuid(
    String(value.sourceFinancialDocumentId ?? ""),
    "allocationAuthority.sourceFinancialDocumentId",
  );
  const allocatedAmountPaise = parseAllocatedAmountPaise(value.allocatedAmountPaise);
  return Object.freeze({
    sourceFinancialDocumentId,
    allocatedAmountPaise,
  });
}

export function canonicalAllocationAuthorityJson(
  allocation: ExplicitReversalAllocationAuthority,
): string {
  return canonicalJson({
    allocatedAmountPaise: allocation.allocatedAmountPaise.toString(),
    sourceFinancialDocumentId: allocation.sourceFinancialDocumentId,
  });
}

export function parseSection34QualificationCode(
  value: string | null | undefined,
): RefundStatutorySection34QualificationCode {
  const code = requireNonEmptyText(value, "section34QualificationCode");
  if (BOOLEAN_LIKE.has(code.toLowerCase())) {
    invalid(
      "Section 34 qualification must not be reduced to a boolean.",
      "section34QualificationCode",
    );
  }
  if (
    !(REFUND_STATUTORY_SECTION34_QUALIFICATION_CODES as readonly string[]).includes(
      code,
    )
  ) {
    invalid(
      "Section 34 qualification code must be one of the canonical BOBA codes.",
      "section34QualificationCode",
    );
  }
  return code as RefundStatutorySection34QualificationCode;
}

export function parseSection34QualificationFacts(
  value: Readonly<Record<string, unknown>> | null | undefined,
  priorTaxInvoiceId: string,
): Readonly<Record<string, unknown>> {
  if (!isPlainObject(value)) {
    invalid(
      "Section 34 qualification facts must be a structured object citing the prior Tax Invoice.",
      "section34QualificationFacts",
    );
  }
  const cited = value.priorTaxInvoiceId;
  if (typeof cited !== "string") {
    invalid(
      "Section 34 qualification facts must cite priorTaxInvoiceId.",
      "section34QualificationFacts",
    );
  }
  const citedId = assertRefundStatutoryUuid(
    cited,
    "section34QualificationFacts.priorTaxInvoiceId",
  );
  if (citedId !== priorTaxInvoiceId) {
    invalid(
      "Section 34 qualification facts must cite the exact prior Tax Invoice.",
      "section34QualificationFacts",
    );
  }
  return Object.freeze({ ...value, priorTaxInvoiceId: citedId });
}

export function normalizeRationaleText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isAbsenceOnlyNoStatutoryDocumentRationale(rationale: string): boolean {
  const normalized = normalizeRationaleText(rationale);
  if (normalized.length === 0) {
    return true;
  }
  return ABSENCE_ONLY_NSD_SUBSTRINGS.some((fragment) =>
    normalized.includes(fragment),
  );
}

export function parseNoStatutoryDocumentReasonCode(
  value: string | null | undefined,
): RefundStatutoryNoStatutoryDocumentReasonCode {
  const code = requireNonEmptyText(value, "noStatutoryDocumentReasonCode");
  if (
    !(REFUND_STATUTORY_NO_STATUTORY_DOCUMENT_REASON_CODES as readonly string[]).includes(
      code,
    )
  ) {
    invalid(
      "NO_STATUTORY_DOCUMENT reason code must be COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT.",
      "noStatutoryDocumentReasonCode",
    );
  }
  return code as RefundStatutoryNoStatutoryDocumentReasonCode;
}

export function parseNoStatutoryDocumentRationale(
  value: string | null | undefined,
): string {
  const rationale = requireNonEmptyText(
    value,
    "noStatutoryDocumentRationale",
  );
  if (isAbsenceOnlyNoStatutoryDocumentRationale(rationale)) {
    invalid(
      "NO_STATUTORY_DOCUMENT requires positive cited authority; absence-only inference is prohibited.",
      "noStatutoryDocumentRationale",
    );
  }
  return rationale;
}

export function parseCommercialFactRefs(
  value: readonly RefundStatutoryCommercialFactRef[] | null | undefined,
): readonly RefundStatutoryCommercialFactRef[] {
  if (!Array.isArray(value) || value.length === 0) {
    invalid(
      "NO_STATUTORY_DOCUMENT requires referenced durable commercial/statutory facts.",
      "referencedCommercialFactRefs",
    );
  }
  const parsed: RefundStatutoryCommercialFactRef[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isPlainObject(entry)) {
      invalid(
        "referencedCommercialFactRefs entries must be structured { kind, id }.",
        "referencedCommercialFactRefs",
      );
    }
    const kind = String(entry.kind ?? "");
    if (
      !(REFUND_STATUTORY_COMMERCIAL_FACT_REF_KINDS as readonly string[]).includes(
        kind,
      )
    ) {
      invalid(
        `Unsupported commercial fact ref kind: ${kind}.`,
        "referencedCommercialFactRefs",
      );
    }
    parsed.push(
      Object.freeze({
        kind: kind as RefundStatutoryCommercialFactRefKind,
        id: assertRefundStatutoryUuid(
          String(entry.id ?? ""),
          `referencedCommercialFactRefs[${index}].id`,
        ),
      }),
    );
  }
  return canonicalizeCommercialFactRefs(parsed);
}

export function canonicalizeCommercialFactRefs(
  refs: readonly RefundStatutoryCommercialFactRef[],
): readonly RefundStatutoryCommercialFactRef[] {
  const unique = new Map<string, RefundStatutoryCommercialFactRef>();
  for (const ref of refs) {
    unique.set(`${ref.kind}:${ref.id}`, Object.freeze({ ...ref }));
  }
  return Object.freeze(
    [...unique.values()].sort((a, b) => {
      if (a.kind === b.kind) {
        return a.id.localeCompare(b.id);
      }
      return a.kind.localeCompare(b.kind);
    }),
  );
}

export function canonicalCommercialFactRefsJson(
  refs: readonly RefundStatutoryCommercialFactRef[],
): string {
  return canonicalJson(canonicalizeCommercialFactRefs(refs));
}

export function parseFinalizeRefundStatutoryDecisionCommand(
  command: FinalizeRefundStatutoryDecisionCommand,
): ParsedFinalizeRefundStatutoryDecisionCommand {
  const decisionId = assertRefundStatutoryUuid(command.decisionId, "decisionId");
  const actorKind = requireNonEmptyText(command.actorKind, "actorKind");
  const actorId = requireNonEmptyText(command.actorId, "actorId");
  const now = requireDate(command.now, "now");
  const base = Object.freeze({ decisionId, actorKind, actorId, now });

  if (command.disposition === "REFUND_VOUCHER") {
    if (
      command.noSupplyAuthorityKind !==
      REFUND_STATUTORY_NO_SUPPLY_AUTHORITY_KINDS[0]
    ) {
      invalid(
        "REFUND_VOUCHER no-supply authority kind must be ORDER_CANCELLED.",
        "noSupplyAuthorityKind",
      );
    }
    const reversalScope = parseReversalScope(command.reversalScope);
    return Object.freeze({
      ...base,
      disposition: "REFUND_VOUCHER",
      priorReceiptVoucherId: assertRefundStatutoryUuid(
        String(command.priorReceiptVoucherId ?? ""),
        "priorReceiptVoucherId",
      ),
      noSupplyAuthorityKind: "ORDER_CANCELLED",
      reversalScope,
      allocationAuthority: parseExplicitAllocationAuthority(
        command.allocationAuthority,
        reversalScope,
      ),
    });
  }

  if (command.disposition === "CREDIT_NOTE") {
    const priorTaxInvoiceId = assertRefundStatutoryUuid(
      String(command.priorTaxInvoiceId ?? ""),
      "priorTaxInvoiceId",
    );
    const reversalScope = parseReversalScope(command.reversalScope);
    return Object.freeze({
      ...base,
      disposition: "CREDIT_NOTE",
      priorTaxInvoiceId,
      section34QualificationCode: parseSection34QualificationCode(
        command.section34QualificationCode,
      ),
      section34QualificationFacts: parseSection34QualificationFacts(
        command.section34QualificationFacts,
        priorTaxInvoiceId,
      ),
      reversalScope,
      allocationAuthority: parseExplicitAllocationAuthority(
        command.allocationAuthority,
        reversalScope,
      ),
    });
  }

  if (command.disposition === "NO_STATUTORY_DOCUMENT") {
    const priorTaxInvoiceId = assertRefundStatutoryUuid(
      String(command.priorTaxInvoiceId ?? ""),
      "priorTaxInvoiceId",
    );
    const referencedCommercialFactRefs = parseCommercialFactRefs(
      command.referencedCommercialFactRefs,
    );
    const citesTaxInvoice = referencedCommercialFactRefs.some(
      (ref) =>
        ref.kind === "financial_document" && ref.id === priorTaxInvoiceId,
    );
    if (!citesTaxInvoice) {
      invalid(
        "NO_STATUTORY_DOCUMENT durable fact refs must cite the relevant Tax Invoice.",
        "referencedCommercialFactRefs",
      );
    }
    return Object.freeze({
      ...base,
      disposition: "NO_STATUTORY_DOCUMENT",
      priorTaxInvoiceId,
      noStatutoryDocumentReasonCode: parseNoStatutoryDocumentReasonCode(
        command.noStatutoryDocumentReasonCode,
      ),
      noStatutoryDocumentRationale: parseNoStatutoryDocumentRationale(
        command.noStatutoryDocumentRationale,
      ),
      referencedCommercialFactRefs,
    });
  }

  invalid("Unsupported statutory disposition.", "disposition");
}

function parseReversalScope(
  value: RefundStatutoryReversalScope | null | undefined,
): RefundStatutoryReversalScope {
  if (
    value == null ||
    !(REFUND_STATUTORY_REVERSAL_SCOPES as readonly string[]).includes(value)
  ) {
    invalid("reversalScope must be FULL or PARTIAL.", "reversalScope");
  }
  return value;
}
