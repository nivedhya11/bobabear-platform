/**
 * Customer Address domain operations (IMP-018).
 * Own-address only — owner-scoped repository lookups, never existence-leaking.
 */
import {
  addressFieldsEqual,
  canonicalizeCreateFields,
  createAffectedFieldNames,
  CustomerAddressError,
  materialChangedFieldNames,
  mergeAndCanonicalizeUpdate,
  parseCreateCustomerAddressInput,
  parseUpdateCustomerAddressInput,
  type CustomerAddress,
} from "../../shared/customer-addresses";
import { PersistenceOperationError } from "../persistence/errors";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "./actor";
import { insertCustomerAddressAuditEvent } from "./audit";
import { isForeignKeyViolation } from "./assert-role";
import {
  deleteCustomerAddressByIdAndCustomerAuthUserId,
  findAddressByIdAndCustomerAuthUserId,
  findAddressRowByIdAndCustomerAuthUserId,
  findDefaultAddressByCustomerAuthUserId,
  insertCustomerAddress,
  listAddressesByCustomerAuthUserId,
  lockCustomerAuthUserForAddressMutation,
  updateCustomerAddressContentById,
  updateCustomerAddressDefaultState,
} from "./repository";

function translatePersistenceError(
  error: unknown,
  fallback: "CUSTOMER_ADDRESS_PERSISTENCE_ERROR" | "CUSTOMER_ADDRESS_AUDIT_ERROR",
): never {
  if (error instanceof CustomerAddressError) throw error;
  if (
    isForeignKeyViolation(error) ||
    (error instanceof PersistenceOperationError && error.code === "23503")
  ) {
    throw new CustomerAddressError(
      "CUSTOMER_AUTH_REQUIRED",
      "Customer-auth identity is required.",
    );
  }
  throw new CustomerAddressError(fallback, "Address persistence failed.");
}

async function insertAuditOrThrow(
  tx: Parameters<typeof insertCustomerAddressAuditEvent>[0],
  input: Parameters<typeof insertCustomerAddressAuditEvent>[1],
): Promise<void> {
  try {
    await insertCustomerAddressAuditEvent(tx, input);
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_AUDIT_ERROR",
      "Failed to insert Address audit event.",
    );
  }
}

export async function listOwnAddresses(
  persistence: Persistence,
  actor: unknown,
): Promise<CustomerAddress[]> {
  const customer = requireCustomerActor(actor);
  return persistence.withContext(async (ctx) => {
    return listAddressesByCustomerAuthUserId(ctx, customer.authUserId);
  });
}

export async function getOwnAddress(
  persistence: Persistence,
  actor: unknown,
  addressId: string,
): Promise<CustomerAddress> {
  const customer = requireCustomerActor(actor);
  if (typeof addressId !== "string" || addressId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }
  return persistence.withContext(async (ctx) => {
    const address = await findAddressByIdAndCustomerAuthUserId(
      ctx,
      addressId,
      customer.authUserId,
    );
    if (!address) {
      throw new CustomerAddressError(
        "CUSTOMER_ADDRESS_NOT_FOUND",
        "Address not found.",
      );
    }
    return address;
  });
}

export async function createOwnAddress(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
): Promise<CustomerAddress> {
  const customer = requireCustomerActor(actor);
  const parsed = parseCreateCustomerAddressInput(input);
  const fields = canonicalizeCreateFields(parsed);
  const makeDefault = parsed.makeDefault === true;

  try {
    return await persistence.transaction(async (tx) => {
      await lockCustomerAuthUserForAddressMutation(tx, customer.authUserId);

      const now = new Date();

      if (!makeDefault) {
        let address: CustomerAddress;
        try {
          address = await insertCustomerAddress(tx, {
            customerAuthUserId: customer.authUserId,
            fields,
            isDefault: false,
            now,
          });
        } catch (error) {
          translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
        }

        await insertAuditOrThrow(tx, {
          actorId: customer.authUserId,
          addressId: address.id,
          customerAuthUserId: customer.authUserId,
          action: "address_created",
          affectedFields: createAffectedFieldNames(fields),
          occurredAt: now,
        });

        return address;
      }

      // makeDefault=true path
      const currentDefault = await findDefaultAddressByCustomerAuthUserId(
        tx,
        customer.authUserId,
      );

      if (currentDefault) {
        try {
          await updateCustomerAddressDefaultState(tx, {
            addressId: currentDefault.id,
            customerAuthUserId: customer.authUserId,
            isDefault: false,
            now,
          });
        } catch (error) {
          translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
        }
      }

      let address: CustomerAddress;
      try {
        address = await insertCustomerAddress(tx, {
          customerAuthUserId: customer.authUserId,
          fields,
          isDefault: true,
          now,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
      }

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId: address.id,
        customerAuthUserId: customer.authUserId,
        action: "address_created",
        affectedFields: createAffectedFieldNames(fields),
        occurredAt: now,
      });

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId: address.id,
        customerAuthUserId: customer.authUserId,
        action: "address_default_set",
        affectedFields: [],
        previousDefaultAddressId: currentDefault?.id ?? null,
        occurredAt: now,
      });

      return address;
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
  }
}

export async function updateOwnAddress(
  persistence: Persistence,
  actor: unknown,
  addressId: string,
  input: unknown,
): Promise<CustomerAddress> {
  const customer = requireCustomerActor(actor);
  if (typeof addressId !== "string" || addressId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }
  const parsed = parseUpdateCustomerAddressInput(input);

  try {
    return await persistence.transaction(async (tx) => {
      await lockCustomerAuthUserForAddressMutation(tx, customer.authUserId);

      const row = await findAddressRowByIdAndCustomerAuthUserId(
        tx,
        addressId,
        customer.authUserId,
      );
      if (!row) {
        throw new CustomerAddressError(
          "CUSTOMER_ADDRESS_NOT_FOUND",
          "Address not found.",
        );
      }

      const next = mergeAndCanonicalizeUpdate(row.fields, parsed);
      if (addressFieldsEqual(row.fields, next)) {
        return row.address;
      }

      const changed = materialChangedFieldNames(row.fields, next);
      const now = new Date();
      let updated: CustomerAddress;
      try {
        updated = await updateCustomerAddressContentById(tx, {
          addressId,
          customerAuthUserId: customer.authUserId,
          fields: next,
          now,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
      }

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId: updated.id,
        customerAuthUserId: customer.authUserId,
        action: "address_updated",
        affectedFields: changed,
        occurredAt: now,
      });

      return updated;
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
  }
}

export async function deleteOwnAddress(
  persistence: Persistence,
  actor: unknown,
  addressId: string,
): Promise<void> {
  const customer = requireCustomerActor(actor);
  if (typeof addressId !== "string" || addressId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }

  try {
    await persistence.transaction(async (tx) => {
      await lockCustomerAuthUserForAddressMutation(tx, customer.authUserId);

      const row = await findAddressRowByIdAndCustomerAuthUserId(
        tx,
        addressId,
        customer.authUserId,
      );
      if (!row) {
        throw new CustomerAddressError(
          "CUSTOMER_ADDRESS_NOT_FOUND",
          "Address not found.",
        );
      }

      const wasDefault = row.isDefault;
      const now = new Date();

      try {
        const deleted = await deleteCustomerAddressByIdAndCustomerAuthUserId(
          tx,
          addressId,
          customer.authUserId,
        );
        if (!deleted) {
          throw new CustomerAddressError(
            "CUSTOMER_ADDRESS_NOT_FOUND",
            "Address not found.",
          );
        }
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
      }

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId,
        customerAuthUserId: customer.authUserId,
        action: "address_deleted",
        affectedFields: [],
        occurredAt: now,
      });

      if (wasDefault) {
        await insertAuditOrThrow(tx, {
          actorId: customer.authUserId,
          addressId,
          customerAuthUserId: customer.authUserId,
          action: "address_default_cleared",
          affectedFields: [],
          occurredAt: now,
        });
      }
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
  }
}

export async function setDefaultOwnAddress(
  persistence: Persistence,
  actor: unknown,
  addressId: string,
): Promise<CustomerAddress> {
  const customer = requireCustomerActor(actor);
  if (typeof addressId !== "string" || addressId.length === 0) {
    throw new CustomerAddressError(
      "CUSTOMER_ADDRESS_NOT_FOUND",
      "Address not found.",
    );
  }

  try {
    return await persistence.transaction(async (tx) => {
      await lockCustomerAuthUserForAddressMutation(tx, customer.authUserId);

      const selected = await findAddressRowByIdAndCustomerAuthUserId(
        tx,
        addressId,
        customer.authUserId,
      );
      if (!selected) {
        throw new CustomerAddressError(
          "CUSTOMER_ADDRESS_NOT_FOUND",
          "Address not found.",
        );
      }

      if (selected.isDefault) {
        return selected.address;
      }

      const currentDefault = await findDefaultAddressByCustomerAuthUserId(
        tx,
        customer.authUserId,
      );
      const now = new Date();

      if (currentDefault && currentDefault.id !== addressId) {
        try {
          await updateCustomerAddressDefaultState(tx, {
            addressId: currentDefault.id,
            customerAuthUserId: customer.authUserId,
            isDefault: false,
            now,
          });
        } catch (error) {
          translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
        }
      }

      let updated: CustomerAddress;
      try {
        updated = await updateCustomerAddressDefaultState(tx, {
          addressId,
          customerAuthUserId: customer.authUserId,
          isDefault: true,
          now,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
      }

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId: updated.id,
        customerAuthUserId: customer.authUserId,
        action: "address_default_set",
        affectedFields: [],
        previousDefaultAddressId: currentDefault?.id ?? null,
        occurredAt: now,
      });

      return updated;
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
  }
}

export async function clearDefaultOwnAddress(
  persistence: Persistence,
  actor: unknown,
): Promise<void> {
  const customer = requireCustomerActor(actor);

  try {
    await persistence.transaction(async (tx) => {
      await lockCustomerAuthUserForAddressMutation(tx, customer.authUserId);

      const currentDefault = await findDefaultAddressByCustomerAuthUserId(
        tx,
        customer.authUserId,
      );
      if (!currentDefault) {
        return;
      }

      const now = new Date();
      try {
        await updateCustomerAddressDefaultState(tx, {
          addressId: currentDefault.id,
          customerAuthUserId: customer.authUserId,
          isDefault: false,
          now,
        });
      } catch (error) {
        translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
      }

      await insertAuditOrThrow(tx, {
        actorId: customer.authUserId,
        addressId: currentDefault.id,
        customerAuthUserId: customer.authUserId,
        action: "address_default_cleared",
        affectedFields: [],
        occurredAt: now,
      });
    });
  } catch (error) {
    if (error instanceof CustomerAddressError) throw error;
    translatePersistenceError(error, "CUSTOMER_ADDRESS_PERSISTENCE_ERROR");
  }
}
