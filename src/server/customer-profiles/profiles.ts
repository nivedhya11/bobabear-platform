/**
 * Customer Profile domain operations (IMP-017).
 * Own-profile only — no customer-ID self-service surface.
 */
import {
  canonicalizeCreateFields,
  createAffectedFieldNames,
  CustomerProfileError,
  materialChangedFieldNames,
  mergeAndCanonicalizeUpdate,
  parseCreateCustomerProfileInput,
  parseUpdateCustomerProfileInput,
  profileFieldsEqual,
  type CustomerProfile,
} from "../../shared/customer-profiles";
import { PersistenceOperationError } from "../persistence/errors";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "./actor";
import { insertCustomerProfileAuditEvent } from "./audit";
import { isForeignKeyViolation, isUniqueViolation } from "./assert-role";
import {
  deleteCustomerProfileById,
  findProfileByCustomerAuthUserId,
  findProfileRowByCustomerAuthUserId,
  insertCustomerProfile,
  updateCustomerProfileById,
} from "./repository";

function translatePersistenceError(error: unknown, fallback: "CUSTOMER_PROFILE_PERSISTENCE_ERROR" | "CUSTOMER_PROFILE_AUDIT_ERROR"): never {
  if (error instanceof CustomerProfileError) throw error;
  if (isUniqueViolation(error)) {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_ALREADY_EXISTS",
      "A Profile already exists for this customer.",
    );
  }
  if (error instanceof PersistenceOperationError && error.code === "23505") {
    throw new CustomerProfileError(
      "CUSTOMER_PROFILE_ALREADY_EXISTS",
      "A Profile already exists for this customer.",
    );
  }
  if (isForeignKeyViolation(error) || (error instanceof PersistenceOperationError && error.code === "23503")) {
    throw new CustomerProfileError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer-auth identity is required.",
    );
  }
  throw new CustomerProfileError(fallback, "Profile persistence failed.");
}

export async function getOwnCustomerProfile(
  persistence: Persistence,
  actor: unknown,
): Promise<CustomerProfile | null> {
  const customer = requireCustomerActor(actor);
  return persistence.withContext(async (ctx) => {
    return findProfileByCustomerAuthUserId(ctx, customer.authUserId);
  });
}

export async function createOwnCustomerProfile(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<CustomerProfile> {
  const customer = requireCustomerActor(actor);
  const parsed = parseCreateCustomerProfileInput(input);
  const fields = canonicalizeCreateFields(parsed);

  try {
    return await persistence.transaction(async (tx) => {
      const existing = await findProfileByCustomerAuthUserId(tx, customer.authUserId);
      if (existing) {
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_ALREADY_EXISTS",
          "A Profile already exists for this customer.",
        );
      }

      let profile: CustomerProfile;
      try {
        profile = await insertCustomerProfile(tx, {
          customerAuthUserId: customer.authUserId,
          fields,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_PROFILE_PERSISTENCE_ERROR");
      }

      try {
        await insertCustomerProfileAuditEvent(tx, {
          actorId: customer.authUserId,
          profileId: profile.id,
          customerAuthUserId: customer.authUserId,
          action: "profile_created",
          affectedFields: createAffectedFieldNames(fields),
        });
      } catch (error) {
        if (error instanceof CustomerProfileError) throw error;
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_AUDIT_ERROR",
          "Failed to insert Profile audit event.",
        );
      }

      return profile;
    });
  } catch (error) {
    if (error instanceof CustomerProfileError) throw error;
    translatePersistenceError(error, "CUSTOMER_PROFILE_PERSISTENCE_ERROR");
  }
}

export async function updateOwnCustomerProfile(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<CustomerProfile> {
  const customer = requireCustomerActor(actor);
  const parsed = parseUpdateCustomerProfileInput(input);

  try {
    return await persistence.transaction(async (tx) => {
      const row = await findProfileRowByCustomerAuthUserId(tx, customer.authUserId);
      if (!row) {
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_NOT_FOUND",
          "Profile not found.",
        );
      }

      const current = {
        givenName: row.givenName,
        familyName: row.familyName ?? null,
        email: row.email ?? null,
      };
      const next = mergeAndCanonicalizeUpdate(current, parsed);

      if (profileFieldsEqual(current, next)) {
        return row.profile;
      }

      const changed = materialChangedFieldNames(current, next);
      let updated: CustomerProfile;
      try {
        updated = await updateCustomerProfileById(tx, {
          profileId: row.id,
          fields: next,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_PROFILE_PERSISTENCE_ERROR");
      }

      try {
        await insertCustomerProfileAuditEvent(tx, {
          actorId: customer.authUserId,
          profileId: row.id,
          customerAuthUserId: customer.authUserId,
          action: "profile_updated",
          affectedFields: changed,
        });
      } catch (error) {
        if (error instanceof CustomerProfileError) throw error;
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_AUDIT_ERROR",
          "Failed to insert Profile audit event.",
        );
      }

      return updated;
    });
  } catch (error) {
    if (error instanceof CustomerProfileError) throw error;
    translatePersistenceError(error, "CUSTOMER_PROFILE_PERSISTENCE_ERROR");
  }
}

export async function deleteOwnCustomerProfile(
  persistence: Persistence,
  actor: unknown,
): Promise<void> {
  const customer = requireCustomerActor(actor);

  try {
    await persistence.transaction(async (tx) => {
      const row = await findProfileRowByCustomerAuthUserId(tx, customer.authUserId);
      if (!row) {
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_NOT_FOUND",
          "Profile not found.",
        );
      }

      const profileId = row.id;
      const customerAuthUserId = row.customerAuthUserId;

      const deleted = await deleteCustomerProfileById(tx, profileId);
      if (!deleted) {
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_NOT_FOUND",
          "Profile not found.",
        );
      }

      try {
        await insertCustomerProfileAuditEvent(tx, {
          actorId: customer.authUserId,
          profileId,
          customerAuthUserId,
          action: "profile_deleted",
          affectedFields: [],
        });
      } catch (error) {
        if (error instanceof CustomerProfileError) throw error;
        throw new CustomerProfileError(
          "CUSTOMER_PROFILE_AUDIT_ERROR",
          "Failed to insert Profile audit event.",
        );
      }
    });
  } catch (error) {
    if (error instanceof CustomerProfileError) throw error;
    translatePersistenceError(error, "CUSTOMER_PROFILE_PERSISTENCE_ERROR");
  }
}
