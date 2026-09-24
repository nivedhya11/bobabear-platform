/**
 * Workforce Pickup handover identity (IMP-036H FD-036H-23 / AC-036H-039).
 *
 * Resolves Order → Checkout.customerAuthUserId → customer_auth_users.
 * Does not invent Snapshot PII, FD recipients, or pickup-address-as-customer.
 */
import { eq } from "drizzle-orm";

import { customerAuthUsers } from "../../../platform/database/schema/customer-auth";
import type { WorkforceOrderCustomerVerification } from "../../../shared/order";
import type { PersistenceQueryContext } from "../../persistence/types";
import { assertApplicationRole } from "../assert-role";
import { peekCheckoutForOrder } from "./checkout";

export async function loadWorkforceCustomerVerification(
  context: PersistenceQueryContext,
  checkoutId: string,
): Promise<WorkforceOrderCustomerVerification | null> {
  assertApplicationRole(context, "loadWorkforceCustomerVerification");
  const checkout = await peekCheckoutForOrder(context, checkoutId);
  if (!checkout) return null;

  const rows = await context.db
    .select({
      name: customerAuthUsers.name,
      phoneNumber: customerAuthUsers.phoneNumber,
      phoneNumberVerified: customerAuthUsers.phoneNumberVerified,
    })
    .from(customerAuthUsers)
    .where(eq(customerAuthUsers.id, checkout.customerAuthUserId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const displayName = row.name.trim();
  if (!displayName) return null;

  const verifiedPhoneE164 =
    row.phoneNumberVerified === true &&
    typeof row.phoneNumber === "string" &&
    row.phoneNumber.trim().length > 0
      ? row.phoneNumber.trim()
      : null;

  return Object.freeze({
    displayName,
    verifiedPhoneE164,
  });
}
