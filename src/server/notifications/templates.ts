/**
 * Template resolution (IMP-033).
 *
 * Only an APPROVED template may back a send attempt, and the variable map is
 * validated against the template's declared schema before it can reach an
 * adapter. A missing or non-approved template is a TEMPLATE_FAILURE, never a
 * "send without a template" fallback.
 */
import "server-only";

import {
  NOTIFICATION_DEFAULT_LOCALE,
  validateTemplateVariables,
  type NotificationChannel,
  type NotificationSemanticType,
  type NotificationTemplate,
} from "../../shared/notifications";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import { findApprovedTemplate } from "./repository";

export { validateTemplateVariables as validateVariables };

/**
 * Resolve the highest-version APPROVED template for a semantic type, falling
 * back to the default locale before giving up.
 */
export async function resolveApprovedTemplate(
  context: PersistenceQueryContext,
  input: Readonly<{
    semanticType: NotificationSemanticType;
    channel: NotificationChannel;
    locale: string;
  }>,
): Promise<NotificationTemplate | null> {
  assertApplicationRole(context, "resolveApprovedTemplate");

  const exact = await findApprovedTemplate(context, input);
  if (exact) return exact;
  if (input.locale === NOTIFICATION_DEFAULT_LOCALE) return null;

  return findApprovedTemplate(context, {
    semanticType: input.semanticType,
    channel: input.channel,
    locale: NOTIFICATION_DEFAULT_LOCALE,
  });
}
