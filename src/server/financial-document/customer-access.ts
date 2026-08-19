/**
 * Customer Financial Document access / read application service
 * (IMP-028 Slice 5 / D-365).
 *
 * Owns authorization ("may customer C access document D?") and resolves the
 * immutable render authority set. Does not implement authentication, HTTP,
 * storage, or automatic statutory issuance policy.
 *
 * ---------------------------------------------------------------------------
 * Customer-access eligibility contract (application layer; not persisted)
 * ---------------------------------------------------------------------------
 *
 * A Financial Document is CUSTOMER-ACCESSIBLE only when durable authority can
 * prove ownership by the authenticated customer:
 *
 *   FinancialDocument.(checkoutId | orderId→Order.checkoutId)
 *     → Checkout.customerAuthUserId
 *     → CustomerActor.authUserId
 *
 * If no such ownership path exists, the document is NOT customer-accessible.
 * That is not equivalent to "the Financial Document is invalid" — it means
 * only that this customer application boundary has no authority to disclose it.
 *
 * Documents issued by generic issueFinancialDocument without checkout/order
 * commercial authority are intentionally representable by the domain and remain
 * outside customer-access scope. Customer access fails closed as
 * DOCUMENT_NOT_FOUND (non-oracle) — never NO_CUSTOMER_OWNER / UNOWNED_DOCUMENT /
 * INTERNAL_DOCUMENT.
 *
 * Eligibility is determined by sealed commercial ownership authority, not by
 * statutory document type alone (TAX_INVOICE / BILL_OF_SUPPLY / RECEIPT_VOUCHER /
 * CREDIT_NOTE / REFUND_VOUCHER are not inherently customer documents).
 *
 * Future BOBA Direct automatic issuance that produces customer-downloadable
 * Financial Documents MUST supply a durable Checkout/Order/Payment/Refund
 * commercial graph from which customer ownership is provable. No Payment→Invoice
 * / Receipt Voucher selection is made here.
 *
 * Unauthorized / unknown / non-customer-associated documents converge to
 * DOCUMENT_NOT_FOUND (no existence oracle). Caller-supplied prior document
 * aggregates are never accepted.
 */

import { CartError } from "../../shared/cart";
import {
  FinancialDocumentError,
  parseGenerateCustomerFinancialDocumentArtifactInput,
  parseGetCustomerFinancialDocumentInput,
  parseListCustomerOrderFinancialDocumentsInput,
  SignatureFoundationError,
  toCustomerFinancialDocumentListItem,
  type CustomerFinancialDocumentAccess,
  type CustomerFinancialDocumentListItem,
  type FinancialDocument,
  type FinancialDocumentArtifact,
} from "../../shared/financial-document";
import { requireCustomerActor } from "../cart/actor";
import { findCheckoutRowById } from "../checkout/repository";
import { findOrderById } from "../order/repository";
import type {
  Persistence,
  PersistenceQueryContext,
} from "../persistence/types";
import {
  listFinancialDocumentsForOrder,
  loadFinancialDocument,
} from "./repository";
import { loadSignedFinancialDocumentArtifactForCustomer } from "./manual-signed-upload";

/**
 * Internal ownership classification for customer-access eligibility.
 * Not persisted. Not exposed as a customer-facing error vocabulary.
 */
export type CustomerFinancialDocumentOwnershipResolution =
  | Readonly<{ kind: "OWNED_BY_ACTOR"; customerAuthUserId: string }>
  | Readonly<{ kind: "OWNED_BY_OTHER_CUSTOMER"; customerAuthUserId: string }>
  | Readonly<{ kind: "NO_CUSTOMER_OWNERSHIP_PATH" }>
  | Readonly<{ kind: "AUTHORITY_INCONSISTENT"; reason: string }>;

function mapCustomerAuthError(error: unknown): never {
  if (error instanceof CartError && error.code === "CUSTOMER_AUTH_REQUIRED") {
    throw new FinancialDocumentError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer authentication is required.",
    );
  }
  throw error;
}

function notFound(): never {
  throw new FinancialDocumentError(
    "DOCUMENT_NOT_FOUND",
    "Financial Document not found.",
  );
}

/**
 * Resolve customer-access ownership from sealed commercial relationships.
 *
 * Distinguishes absence of a customer ownership path from ownership by another
 * customer and from authority-graph defects. Customer-facing callers must still
 * map non-owned outcomes to the non-oracle DOCUMENT_NOT_FOUND convention.
 */
export async function resolveCustomerFinancialDocumentOwnership(
  context: PersistenceQueryContext,
  document: FinancialDocument,
  actorAuthUserId: string,
): Promise<CustomerFinancialDocumentOwnershipResolution> {
  let checkoutId = document.checkoutId;

  if (document.orderId) {
    const order = await findOrderById(context, document.orderId);
    if (!order) {
      return Object.freeze({
        kind: "AUTHORITY_INCONSISTENT",
        reason: "Sealed orderId does not resolve to an Order.",
      });
    }
    if (checkoutId && order.checkoutId !== checkoutId) {
      return Object.freeze({
        kind: "AUTHORITY_INCONSISTENT",
        reason: "Sealed checkoutId disagrees with Order.checkoutId.",
      });
    }
    checkoutId = order.checkoutId;
  }

  if (!checkoutId) {
    return Object.freeze({ kind: "NO_CUSTOMER_OWNERSHIP_PATH" });
  }

  const checkout = await findCheckoutRowById(context, checkoutId);
  if (!checkout) {
    return Object.freeze({
      kind: "AUTHORITY_INCONSISTENT",
      reason: "Sealed checkoutId does not resolve to a Checkout.",
    });
  }
  if (!checkout.customerAuthUserId) {
    return Object.freeze({ kind: "NO_CUSTOMER_OWNERSHIP_PATH" });
  }

  if (checkout.customerAuthUserId === actorAuthUserId) {
    return Object.freeze({
      kind: "OWNED_BY_ACTOR",
      customerAuthUserId: checkout.customerAuthUserId,
    });
  }

  return Object.freeze({
    kind: "OWNED_BY_OTHER_CUSTOMER",
    customerAuthUserId: checkout.customerAuthUserId,
  });
}

/**
 * Commercial-graph consistency for prior authority (defense in depth).
 *
 * Compares checkoutId / orderId / paymentId / checkoutSnapshotId when both
 * sides present. Does NOT blindly require refundId equality: Credit Note may
 * carry a refundId while its prior Tax Invoice correctly has none (D-365).
 */
function commercialGraphConsistent(
  current: FinancialDocument,
  prior: FinancialDocument,
): boolean {
  if (
    current.checkoutId &&
    prior.checkoutId &&
    current.checkoutId !== prior.checkoutId
  ) {
    return false;
  }
  if (
    current.orderId &&
    prior.orderId &&
    current.orderId !== prior.orderId
  ) {
    return false;
  }
  if (
    current.paymentId &&
    prior.paymentId &&
    current.paymentId !== prior.paymentId
  ) {
    return false;
  }
  if (
    current.checkoutSnapshotId &&
    prior.checkoutSnapshotId &&
    current.checkoutSnapshotId !== prior.checkoutSnapshotId
  ) {
    return false;
  }
  return true;
}

/**
 * Load and verify the sealed prior Financial Document for rendering authority.
 * Prior id is never accepted from the caller — only from current.priorFinancialDocumentId.
 */
async function resolveSealedPriorAuthority(
  context: PersistenceQueryContext,
  current: FinancialDocument,
  owningCustomerAuthUserId: string,
): Promise<FinancialDocument | null> {
  const priorId = current.priorFinancialDocumentId;
  if (!priorId) {
    if (current.priorDocumentType) {
      throw new FinancialDocumentError(
        "AUTHORITY_INCONSISTENT",
        "Sealed priorDocumentType is present without priorFinancialDocumentId.",
      );
    }
    return null;
  }

  const prior = await loadFinancialDocument(context, priorId);
  if (!prior) {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Sealed prior Financial Document could not be loaded.",
    );
  }

  if (prior.id !== current.priorFinancialDocumentId) {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Loaded prior Financial Document id does not match sealed priorFinancialDocumentId.",
    );
  }

  if (
    !current.priorDocumentType ||
    prior.documentType !== current.priorDocumentType
  ) {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Prior Financial Document type does not match sealed priorDocumentType.",
    );
  }

  if (prior.status !== "ISSUED") {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Prior Financial Document is not ISSUED.",
    );
  }

  if (prior.legalEntityId !== current.legalEntityId) {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Prior Financial Document legal entity does not match the current document.",
    );
  }

  if (!commercialGraphConsistent(current, prior)) {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Prior Financial Document commercial graph is inconsistent with the current document.",
    );
  }

  const priorOwnership = await resolveCustomerFinancialDocumentOwnership(
    context,
    prior,
    owningCustomerAuthUserId,
  );
  if (priorOwnership.kind !== "OWNED_BY_ACTOR") {
    throw new FinancialDocumentError(
      "AUTHORITY_INCONSISTENT",
      "Prior Financial Document does not belong to the same customer ownership authority.",
    );
  }

  return prior;
}

/**
 * Map ownership resolution to customer-facing disclosure.
 *
 * OWNED_BY_ACTOR → proceed.
 * NO_CUSTOMER_OWNERSHIP_PATH / OWNED_BY_OTHER_CUSTOMER → DOCUMENT_NOT_FOUND.
 * AUTHORITY_INCONSISTENT on the *current* document (before ownership is proven)
 * also converges to DOCUMENT_NOT_FOUND so existence is not revealed.
 */
function requireOwnedByActor(
  ownership: CustomerFinancialDocumentOwnershipResolution,
): string {
  if (ownership.kind === "OWNED_BY_ACTOR") {
    return ownership.customerAuthUserId;
  }
  notFound();
}

async function loadAuthorizedCustomerDocumentAccess(
  persistence: Persistence,
  customerAuthUserId: string,
  financialDocumentId: string,
): Promise<CustomerFinancialDocumentAccess> {
  return persistence.withContext(async (ctx) => {
    const document = await loadFinancialDocument(ctx, financialDocumentId);
    if (!document) {
      notFound();
    }

    if (document.status !== "ISSUED") {
      notFound();
    }

    const ownership = await resolveCustomerFinancialDocumentOwnership(
      ctx,
      document,
      customerAuthUserId,
    );
    const owner = requireOwnedByActor(ownership);

    const priorFinancialDocument = await resolveSealedPriorAuthority(
      ctx,
      document,
      owner,
    );

    return Object.freeze({
      document,
      priorFinancialDocument,
    });
  });
}

/**
 * Authorized customer single-document access with sealed prior resolution.
 */
export async function getCustomerFinancialDocument(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<CustomerFinancialDocumentAccess> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseGetCustomerFinancialDocumentInput(input);
  return loadAuthorizedCustomerDocumentAccess(
    persistence,
    customer.authUserId,
    parsed.financialDocumentId,
  );
}

/**
 * Discover issued Financial Documents for an authorized customer's Order.
 * Ordering: issueAt ASC, statutoryDocumentNumber ASC, id ASC.
 *
 * Order ownership is authorized BEFORE listing. Generic / non-order Financial
 * Documents are never included merely because they share an unrelated reference.
 */
export async function listFinancialDocumentsForCustomerOrder(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<readonly CustomerFinancialDocumentListItem[]> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseListCustomerOrderFinancialDocumentsInput(input);

  return persistence.withContext(async (ctx) => {
    const order = await findOrderById(ctx, parsed.orderId);
    if (!order) {
      notFound();
    }
    const checkout = await findCheckoutRowById(ctx, order.checkoutId);
    if (!checkout || checkout.customerAuthUserId !== customer.authUserId) {
      notFound();
    }

    const documents = await listFinancialDocumentsForOrder(ctx, {
      orderId: order.id,
      checkoutId: order.checkoutId,
    });
    return Object.freeze(
      documents
        .filter((doc) => doc.status === "ISSUED")
        .map(toCustomerFinancialDocumentListItem),
    );
  });
}

/**
 * Authorization → signature-gated exact stored PDF bytes.
 * Unsigned required documents are denied. No HTTP transport or download URLs.
 */
export async function generateCustomerFinancialDocumentArtifact(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<FinancialDocumentArtifact> {
  let customer;
  try {
    customer = requireCustomerActor(actor);
  } catch (error) {
    mapCustomerAuthError(error);
  }
  const parsed = parseGenerateCustomerFinancialDocumentArtifactInput(input);
  const access = await loadAuthorizedCustomerDocumentAccess(
    persistence,
    customer.authUserId,
    parsed.financialDocumentId,
  );

  try {
    return await persistence.withContext(async (ctx) =>
      loadSignedFinancialDocumentArtifactForCustomer(ctx, access.document),
    );
  } catch (error) {
    if (error instanceof SignatureFoundationError) {
      notFound();
    }
    throw error;
  }
}
