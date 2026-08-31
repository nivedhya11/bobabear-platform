/**
 * Notification send policy, database-backed (IMP-033).
 *
 * Loads consent, channel preference, and already-dispatched progress for one
 * request and defers every decision to the pure evaluators in
 * `src/shared/notifications/policy.ts`.
 */
import "server-only";

import {
  computeNotificationDedupKey,
  evaluateConsent,
  evaluatePreference,
  evaluateSendPolicy,
  evaluateStaleness,
  isStaleSemantic,
  purposeForSemanticType,
  shouldExpire,
  type NotificationPolicyDecision,
  type NotificationRequest,
  type NotificationSemanticType,
} from "../../shared/notifications";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole } from "./assert-role";
import {
  findConsent,
  findPreference,
  listDispatchedSemanticTypesForOrder,
} from "./repository";

export {
  computeNotificationDedupKey,
  evaluateConsent,
  evaluatePreference,
  evaluateStaleness,
  isStaleSemantic,
  shouldExpire,
};

/**
 * Re-evaluate the full send gate against current durable facts.
 *
 * Always re-read: a consent withdrawal or a later progress notification may
 * have landed after the request was created, and a resend must never bypass
 * either.
 */
export async function evaluateNotificationSendPolicy(
  context: PersistenceQueryContext,
  request: NotificationRequest,
  now: Date,
): Promise<NotificationPolicyDecision> {
  assertApplicationRole(context, "evaluateNotificationSendPolicy");

  const purpose = purposeForSemanticType(request.semanticType);
  const consent = await findConsent(context, request.customerId, purpose);
  const preference = await findPreference(context, request.customerId, request.channel);

  const dispatched: readonly NotificationSemanticType[] = request.orderId
    ? await listDispatchedSemanticTypesForOrder(context, request.orderId, request.id)
    : Object.freeze([]);

  return evaluateSendPolicy({
    semanticType: request.semanticType,
    channel: request.channel,
    consent,
    preference,
    alreadyDispatchedSemanticTypes: dispatched,
    expiresAt: request.expiresAt,
    now,
  });
}
