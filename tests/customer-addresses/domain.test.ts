/**
 * Customer Address domain / canonicalization tests (IMP-018).
 */
import { afterEach, describe, expect, inject, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  canonicalizeAddressText,
  canonicalizeCoordinates,
  canonicalizePostalCode,
  canonicalizeRecipientPhone,
  canonicalizeStateCode,
  CustomerAddressError,
  INDIA_SUBDIVISION_CODES,
  parseCreateCustomerAddressInput,
  parseUpdateCustomerAddressInput,
} from "../../src/shared/customer-addresses";
import {
  clearDefaultOwnAddress,
  createOwnAddress,
  deleteOwnAddress,
  getOwnAddress,
  listOwnAddresses,
  setDefaultOwnAddress,
  updateOwnAddress,
} from "../../src/server/customer-addresses";
import {
  createOwnCustomerProfile,
  deleteOwnCustomerProfile,
  getOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
  minimalAddressCreateInput,
} from "../database/support/customer-addresses-fixtures";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "../database/support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function seedAuthUser(connectionString: string, id: string, phone = "+919876543210") {
  await withTestDatabaseClient(connectionString, async (client) => {
    await client.pool.query(
      `insert into app.customer_auth_users
        (id, name, email, email_verified, phone_number, phone_number_verified, created_at, updated_at)
       values ($1, 'Customer', $2, false, $3, true, now(), now())`,
      [id, `${id}@example.test`, phone],
    );
  });
}

function expectAddressError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.unreachable(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CustomerAddressError);
    expect((error as CustomerAddressError).code).toBe(code);
  }
}

describe("IMP-018 text / phone / state / PIN / coordinates canonicalization", () => {
  it("collapses spacing, preserves Unicode, rejects controls, enforces length", () => {
    expect(canonicalizeAddressText("  Flat   204  ", "addressLine1")).toBe("Flat 204");
    expect(canonicalizeAddressText("José", "recipientName")).toBe("José");
    expect(canonicalizeAddressText("अशुतोष", "recipientName")).toBe("अशुतोष");
    expect(canonicalizeAddressText("O'Connor", "recipientName")).toBe("O'Connor");

    const composed = "é";
    const decomposed = "e\u0301";
    expect(canonicalizeAddressText(decomposed, "city")).toBe(
      canonicalizeAddressText(composed, "city"),
    );

    for (const bad of ["Flat\n204", "Flat\t204", "Flat\0A"]) {
      expect(() => canonicalizeAddressText(bad, "addressLine1")).toThrow(CustomerAddressError);
    }

    expect(canonicalizeAddressText("A".repeat(100), "recipientName")).toHaveLength(100);
    expect(() => canonicalizeAddressText("A".repeat(101), "recipientName")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(200), "addressLine1")).toHaveLength(200);
    expect(() => canonicalizeAddressText("A".repeat(201), "addressLine1")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(200), "addressLine2")).toHaveLength(200);
    expect(() => canonicalizeAddressText("A".repeat(201), "addressLine2")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(150), "landmark")).toHaveLength(150);
    expect(() => canonicalizeAddressText("A".repeat(151), "landmark")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(120), "locality")).toHaveLength(120);
    expect(() => canonicalizeAddressText("A".repeat(121), "locality")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(100), "city")).toHaveLength(100);
    expect(() => canonicalizeAddressText("A".repeat(101), "city")).toThrow(
      CustomerAddressError,
    );
    expect(canonicalizeAddressText("A".repeat(50), "label")).toHaveLength(50);
    expect(() => canonicalizeAddressText("A".repeat(51), "label")).toThrow(
      CustomerAddressError,
    );
    expectAddressError(
      () => canonicalizeAddressText("   ", "addressLine1"),
      "CUSTOMER_ADDRESS_LINE1_REQUIRED",
    );
    expect(canonicalizeAddressText("   ", "label")).toBeNull();
  });

  it("normalizes Indian mobile numbers and rejects non-mobile / non-IN", () => {
    expect(canonicalizeRecipientPhone("+919876543210")).toBe("+919876543210");
    expect(canonicalizeRecipientPhone("9876543210")).toBe("+919876543210");
    expect(canonicalizeRecipientPhone("09876543210")).toBe("+919876543210");
    expect(canonicalizeRecipientPhone("91 98765 43210")).toBe("+919876543210");

    for (const bad of ["+14155552671", "12345", "01123456789", ""]) {
      expectAddressError(
        () => canonicalizeRecipientPhone(bad),
        "CUSTOMER_ADDRESS_RECIPIENT_PHONE_INVALID",
      );
    }
  });

  it("accepts only canonical ISO 3166-2:IN state codes", () => {
    expect(canonicalizeStateCode("IN-UT")).toBe("IN-UT");
    expect(canonicalizeStateCode(" IN-DL ")).toBe("IN-DL");
    expect(INDIA_SUBDIVISION_CODES).toHaveLength(36);
    expect(INDIA_SUBDIVISION_CODES).toContain("IN-OR");
    expect(INDIA_SUBDIVISION_CODES).toContain("IN-UT");

    for (const bad of ["UT", "UK", "IN-XX", "uttarakhand", ""]) {
      expectAddressError(() => canonicalizeStateCode(bad), "CUSTOMER_ADDRESS_STATE_CODE_INVALID");
    }
  });

  it("enforces six-digit Indian PIN starting 1-9", () => {
    expect(canonicalizePostalCode("248001")).toBe("248001");
    expect(canonicalizePostalCode(" 110001 ")).toBe("110001");
    for (const bad of ["048001", "24800", "2480011", "24800a", "248 001", "248-001", "ABCDEF", ""]) {
      expectAddressError(() => canonicalizePostalCode(bad), "CUSTOMER_ADDRESS_POSTAL_CODE_INVALID");
    }
  });

  it("canonicalizes coordinates to 7 fractional digits and rejects invalid pairs", () => {
    expect(
      canonicalizeCoordinates({ latitude: "30", longitude: "78" }),
    ).toEqual({
      latitude: "30.0000000",
      longitude: "78.0000000",
    });
    expect(
      canonicalizeCoordinates({ latitude: "30.1", longitude: "78.032188" }),
    ).toEqual({
      latitude: "30.1000000",
      longitude: "78.0321880",
    });
    expect(
      canonicalizeCoordinates({ latitude: "-0", longitude: "0" }),
    ).toEqual({
      latitude: "0.0000000",
      longitude: "0.0000000",
    });
    expect(
      canonicalizeCoordinates({ latitude: "30.3165", longitude: "78.0322" }),
    ).toEqual({
      latitude: "30.3165000",
      longitude: "78.0322000",
    });
    expect(
      canonicalizeCoordinates({ latitude: "30.1234567", longitude: "78.0321880" }),
    ).toEqual({
      latitude: "30.1234567",
      longitude: "78.0321880",
    });
    expect(
      canonicalizeCoordinates({ latitude: "30.123456700", longitude: "78.0321880" }),
    ).toEqual({
      latitude: "30.1234567",
      longitude: "78.0321880",
    });
    expect(canonicalizeCoordinates(null)).toBeNull();
    expect(
      canonicalizeCoordinates({ latitude: "90.0000000", longitude: "-180.0000000" }),
    ).toEqual({
      latitude: "90.0000000",
      longitude: "-180.0000000",
    });

    expectAddressError(
      () => canonicalizeCoordinates({ latitude: "30.123456701", longitude: "78.0322000" }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
    expectAddressError(
      () => canonicalizeCoordinates({ latitude: "30.31650001", longitude: "78.0322000" }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
    expectAddressError(
      () => canonicalizeCoordinates({ latitude: "1e2", longitude: "78.0" }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
    expectAddressError(
      () => canonicalizeCoordinates({ latitude: "91.0", longitude: "78.0" }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
    expectAddressError(
      () =>
        canonicalizeCoordinates({ latitude: 30.3 as unknown as string, longitude: "78.0" }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
    expectAddressError(
      () =>
        canonicalizeCoordinates({ latitude: "30.3" } as {
          latitude: string;
          longitude: string;
        }),
      "CUSTOMER_ADDRESS_COORDINATES_INVALID",
    );
  });
});

describe("IMP-018 strict mutation input", () => {
  it("rejects forbidden and unknown fields on create/update", () => {
    for (const field of [
      "id",
      "addressId",
      "customerId",
      "customerAuthUserId",
      "ownerId",
      "authUserId",
      "profileId",
      "customerProfileId",
      "createdAt",
      "updatedAt",
      "isDefault",
      "makeDefault",
      "country",
      "countryCode",
      "serviceable",
      "isServiceable",
      "serviceabilityStatus",
      "deliveryZoneId",
      "assignedOutletId",
      "nearestOutletId",
      "deliveryFee",
      "distance",
      "distanceKm",
      "brandId",
      "outletId",
      "geocoderProvider",
      "geocodeConfidence",
      "coordinatesVerified",
      "lastUsedAt",
      "orderCount",
      "marketingOptIn",
      "loyaltyTier",
      "unknownThing",
    ]) {
      if (field !== "makeDefault") {
        expectAddressError(
          () =>
            parseCreateCustomerAddressInput({
              ...minimalAddressCreateInput(),
              [field]: "x",
            }),
          "CUSTOMER_ADDRESS_FIELD_NOT_ALLOWED",
        );
      }
      expectAddressError(
        () => parseUpdateCustomerAddressInput({ recipientName: "A", [field]: "x" }),
        "CUSTOMER_ADDRESS_FIELD_NOT_ALLOWED",
      );
    }
  });
});

describe("IMP-018 domain operations", () => {
  it("create / read / list ordering / update no-op / default / delete with audit privacy", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-domain");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-domain");

      expect(await listOwnAddresses(persistence, actor)).toEqual([]);

      const first = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({
          recipientName: "  Ashutosh   Joshi  ",
          recipientPhone: "9876543210",
          addressLine1: "  Flat 204, Block-B  ",
          coordinates: { latitude: "30.3165", longitude: "78.0322" },
          label: " Home ",
        }),
      );
      expect(first.recipientName).toBe("Ashutosh Joshi");
      expect(first.recipientPhone).toBe("+919876543210");
      expect(first.addressLine1).toBe("Flat 204, Block-B");
      expect(first.coordinates).toEqual({
        latitude: "30.3165000",
        longitude: "78.0322000",
      });
      expect(first.label).toBe("Home");
      expect(first.isDefault).toBe(false);
      expect(first).not.toHaveProperty("customerAuthUserId");

      const second = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({
          label: "Work",
          makeDefault: true,
          addressLine1: "Office Park",
        }),
      );
      expect(second.isDefault).toBe(true);

      const third = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ label: "Other", addressLine1: "Another" }),
      );

      const listed = await listOwnAddresses(persistence, actor);
      expect(listed.map((a) => a.id)).toEqual([second.id, first.id, third.id]);
      expect(listed[0]?.isDefault).toBe(true);

      const read = await getOwnAddress(persistence, actor, first.id);
      expect(Object.keys(read).sort()).toEqual([
        "addressLine1",
        "addressLine2",
        "city",
        "coordinates",
        "createdAt",
        "id",
        "isDefault",
        "label",
        "landmark",
        "locality",
        "postalCode",
        "recipientName",
        "recipientPhone",
        "stateCode",
        "updatedAt",
      ]);

      // Canonical no-op
      const noop = await updateOwnAddress(persistence, actor, first.id, {
        recipientPhone: " 9876543210 ",
        coordinates: { latitude: "30.3165000", longitude: "78.0322000" },
      });
      expect(noop.updatedAt.getTime()).toBe(first.updatedAt.getTime());

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const audits = await client.pool.query(
          `select action from app.customer_address_audit_events where address_id = $1`,
          [first.id],
        );
        expect(audits.rows.every((r) => r.action !== "address_updated")).toBe(true);
      });

      const updated = await updateOwnAddress(persistence, actor, first.id, {
        city: "Mussoorie",
        label: null,
      });
      expect(updated.city).toBe("Mussoorie");
      expect(updated.label).toBeNull();
      expect(updated.updatedAt.getTime()).toBeGreaterThan(first.updatedAt.getTime());

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const audits = await client.pool.query<{
          action: string;
          affected_fields: string[];
        }>(
          `select action, affected_fields from app.customer_address_audit_events
           where action = 'address_updated'`,
        );
        expect(audits.rowCount).toBe(1);
        expect(audits.rows[0]?.affected_fields.sort()).toEqual(["city", "label"]);
        const blob = JSON.stringify(audits.rows);
        expect(blob).not.toMatch(/Ashutosh|Mussoorie|Flat 204|\+919876543210/i);
      });

      await setDefaultOwnAddress(persistence, actor, first.id);
      expect((await getOwnAddress(persistence, actor, first.id)).isDefault).toBe(true);
      expect((await getOwnAddress(persistence, actor, second.id)).isDefault).toBe(false);

      await clearDefaultOwnAddress(persistence, actor);
      expect((await listOwnAddresses(persistence, actor)).every((a) => !a.isDefault)).toBe(true);

      // Idempotent clear
      await clearDefaultOwnAddress(persistence, actor);

      await deleteOwnAddress(persistence, actor, third.id);
      await expect(getOwnAddress(persistence, actor, third.id)).rejects.toMatchObject({
        code: "CUSTOMER_ADDRESS_NOT_FOUND",
      });
      await expect(deleteOwnAddress(persistence, actor, third.id)).rejects.toMatchObject({
        code: "CUSTOMER_ADDRESS_NOT_FOUND",
      });

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const auth = await client.pool.query<{ phone_number: string }>(
          `select phone_number from app.customer_auth_users where id = 'cust-domain'`,
        );
        expect(auth.rows[0]?.phone_number).toBe("+919876543210");
      });
    });
  });

  it("update requires existing Address; reads create no audit", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-missing");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-missing");

      await expect(
        updateOwnAddress(persistence, actor, "00000000-0000-4000-8000-000000000001", {
          city: "X",
        }),
      ).rejects.toMatchObject({ code: "CUSTOMER_ADDRESS_NOT_FOUND" });

      await listOwnAddresses(persistence, actor);
      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(
          sql`select count(*)::text as c from app.customer_address_audit_events`,
        );
        expect(count.rows[0]?.c).toBe("0");
      });
    });
  });

  it("Address and Profile are independent resources", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-indep");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-indep");

      const profile = await createOwnCustomerProfile(persistence, actor, {
        givenName: "Ashutosh",
      });
      const address = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput(),
      );

      await deleteOwnAddress(persistence, actor, address.id);
      expect((await getOwnCustomerProfile(persistence, actor))?.id).toBe(profile.id);

      const address2 = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ label: "Again" }),
      );
      await deleteOwnCustomerProfile(persistence, actor);
      expect(await getOwnCustomerProfile(persistence, actor)).toBeNull();
      expect((await getOwnAddress(persistence, actor, address2.id)).id).toBe(address2.id);
    });
  });

  it("rolls back Address mutation when audit insert fails", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-atomic");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-atomic");

      const installDeny = async () => {
        await withTestDatabaseClient(database.connectionString, async (client) => {
          await client.pool.query(`
            create or replace function app.deny_address_audit() returns trigger as $$
            begin
              raise exception 'forced audit failure';
            end;
            $$ language plpgsql;
            drop trigger if exists deny_address_audit_trg on app.customer_address_audit_events;
            create trigger deny_address_audit_trg
              before insert on app.customer_address_audit_events
              for each row execute function app.deny_address_audit();
          `);
        });
      };
      const removeDeny = async () => {
        await withTestDatabaseClient(database.connectionString, async (client) => {
          await client.pool.query(
            `drop trigger if exists deny_address_audit_trg on app.customer_address_audit_events`,
          );
          await client.pool.query(`drop function if exists app.deny_address_audit()`);
        });
      };

      await installDeny();
      await expect(
        createOwnAddress(persistence, actor, minimalAddressCreateInput()),
      ).rejects.toBeTruthy();
      expect(await listOwnAddresses(persistence, actor)).toEqual([]);
      await removeDeny();

      const prior = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ makeDefault: true, label: "Prior" }),
      );
      expect(prior.isDefault).toBe(true);

      await installDeny();
      await expect(
        createOwnAddress(
          persistence,
          actor,
          minimalAddressCreateInput({ makeDefault: true, label: "NewDefault" }),
        ),
      ).rejects.toBeTruthy();
      const afterFailedCreateDefault = await listOwnAddresses(persistence, actor);
      expect(afterFailedCreateDefault).toHaveLength(1);
      expect(afterFailedCreateDefault[0]?.id).toBe(prior.id);
      expect(afterFailedCreateDefault[0]?.isDefault).toBe(true);
      await removeDeny();

      const other = await createOwnAddress(
        persistence,
        actor,
        minimalAddressCreateInput({ label: "Other", makeDefault: false }),
      );
      expect(other.isDefault).toBe(false);

      await installDeny();
      await expect(
        updateOwnAddress(persistence, actor, prior.id, { city: "Changed" }),
      ).rejects.toBeTruthy();
      expect((await getOwnAddress(persistence, actor, prior.id)).city).toBe("Dehradun");

      await expect(setDefaultOwnAddress(persistence, actor, other.id)).rejects.toBeTruthy();
      expect((await getOwnAddress(persistence, actor, prior.id)).isDefault).toBe(true);
      expect((await getOwnAddress(persistence, actor, other.id)).isDefault).toBe(false);

      await expect(clearDefaultOwnAddress(persistence, actor)).rejects.toBeTruthy();
      expect((await getOwnAddress(persistence, actor, prior.id)).isDefault).toBe(true);

      await expect(deleteOwnAddress(persistence, actor, other.id)).rejects.toBeTruthy();
      expect((await getOwnAddress(persistence, actor, other.id)).id).toBe(other.id);

      await expect(deleteOwnAddress(persistence, actor, prior.id)).rejects.toBeTruthy();
      expect((await getOwnAddress(persistence, actor, prior.id)).id).toBe(prior.id);
      expect((await getOwnAddress(persistence, actor, prior.id)).isDefault).toBe(true);
      await removeDeny();
    });
  });
});
