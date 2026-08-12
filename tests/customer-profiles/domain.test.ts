/**
 * Customer Profile domain / canonicalization tests (IMP-017).
 */
import { afterEach, describe, expect, inject, it } from "vitest";
import { sql } from "drizzle-orm";

import {
  canonicalizeCustomerEmail,
  canonicalizeCustomerName,
  CustomerProfileError,
  parseCreateCustomerProfileInput,
  parseUpdateCustomerProfileInput,
} from "../../src/shared/customer-profiles";
import {
  createOwnCustomerProfile,
  deleteOwnCustomerProfile,
  getOwnCustomerProfile,
  updateOwnCustomerProfile,
} from "../../src/server/customer-profiles";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  customerActor,
} from "../database/support/customer-profiles-fixtures";
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

describe("IMP-017 name / email canonicalization", () => {
  it("collapses spacing and preserves Unicode names", () => {
    expect(canonicalizeCustomerName("  Ashutosh   Joshi  ", "givenName")).toBe("Ashutosh Joshi");
    expect(canonicalizeCustomerName("José", "givenName")).toBe("José");
    expect(canonicalizeCustomerName("अशुतोष", "givenName")).toBe("अशुतोष");
    expect(canonicalizeCustomerName("O'Connor", "familyName")).toBe("O'Connor");
    expect(canonicalizeCustomerName("Smith-Jones", "familyName")).toBe("Smith-Jones");
    expect(canonicalizeCustomerName("   ", "familyName")).toBeNull();
  });

  it("normalizes equivalent NFC forms", () => {
    const composed = "é";
    const decomposed = "e\u0301";
    expect(canonicalizeCustomerName(decomposed, "givenName")).toBe(
      canonicalizeCustomerName(composed, "givenName"),
    );
  });

  it("rejects control characters before whitespace collapsing", () => {
    for (const bad of ["Ashutosh\nJoshi", "Ashutosh\tJoshi", "Ashutosh\0Joshi"]) {
      expect(() => canonicalizeCustomerName(bad, "givenName")).toThrow(CustomerProfileError);
    }
  });

  it("enforces name length boundaries", () => {
    expect(canonicalizeCustomerName("A", "givenName")).toBe("A");
    expect(canonicalizeCustomerName("A".repeat(100), "givenName")).toHaveLength(100);
    expect(() => canonicalizeCustomerName("A".repeat(101), "givenName")).toThrow(
      /CUSTOMER_PROFILE_GIVEN_NAME_INVALID|length/i,
    );
    expect(canonicalizeCustomerName("A".repeat(100), "familyName")).toHaveLength(100);
    expect(() => canonicalizeCustomerName("A".repeat(101), "familyName")).toThrow(
      CustomerProfileError,
    );
    expect(() => canonicalizeCustomerName("   ", "givenName")).toThrow(CustomerProfileError);
  });

  it("canonicalizes email: preserve local case, lowercase domain", () => {
    expect(canonicalizeCustomerEmail(" Test.User@Example.COM ")).toBe("Test.User@example.com");
    expect(canonicalizeCustomerEmail("USER@EXAMPLE.COM")).toBe("USER@example.com");
    expect(canonicalizeCustomerEmail("User@example.com")).toBe("User@example.com");
    expect(canonicalizeCustomerEmail("user@example.com")).toBe("user@example.com");
    expect(canonicalizeCustomerEmail("   ")).toBeNull();
    expect(canonicalizeCustomerEmail(null)).toBeNull();
  });

  it("validates email structure and 254-char max", () => {
    for (const bad of ["abc", "abc@", "@example.com", "a b@example.com"]) {
      expect(() => canonicalizeCustomerEmail(bad)).toThrow(CustomerProfileError);
    }
    const exact254 = `${"x".repeat(64)}@${"y".repeat(185)}.com`;
    expect(exact254.length).toBe(254);
    expect(canonicalizeCustomerEmail(exact254)).toBe(exact254);
    const tooLong = `${"x".repeat(64)}@${"y".repeat(186)}.com`;
    expect(tooLong.length).toBeGreaterThan(254);
    expect(() => canonicalizeCustomerEmail(tooLong)).toThrow(CustomerProfileError);
  });
});

describe("IMP-017 strict mutation input", () => {
  it("rejects forbidden and unknown fields", () => {
    for (const field of [
      "phone",
      "authUserId",
      "customerId",
      "profileId",
      "createdAt",
      "updatedAt",
      "marketingOptIn",
      "loyaltyTier",
      "unknownThing",
    ]) {
      expect(() =>
        parseCreateCustomerProfileInput({ givenName: "A", [field]: "x" }),
      ).toThrow(CustomerProfileError);
      expect(() =>
        parseUpdateCustomerProfileInput({ givenName: "A", [field]: "x" }),
      ).toThrow(CustomerProfileError);
    }
  });
});

describe("IMP-017 domain operations", () => {
  it("create / read / update / no-op / delete / recreate with audit semantics", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-domain");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-domain");

      expect(await getOwnCustomerProfile(persistence, actor)).toBeNull();

      const created = await createOwnCustomerProfile(persistence, actor, {
        givenName: "  Ashutosh  ",
        familyName: "  Joshi  ",
        email: " Test.User@Example.COM ",
      });
      expect(created.givenName).toBe("Ashutosh");
      expect(created.familyName).toBe("Joshi");
      expect(created.email).toBe("Test.User@example.com");
      expect(created).not.toHaveProperty("customerAuthUserId");

      await expect(
        createOwnCustomerProfile(persistence, actor, { givenName: "Again" }),
      ).rejects.toMatchObject({ code: "CUSTOMER_PROFILE_ALREADY_EXISTS" });

      const read = await getOwnCustomerProfile(persistence, actor);
      expect(read?.id).toBe(created.id);
      expect(Object.keys(read!).sort()).toEqual([
        "createdAt",
        "email",
        "familyName",
        "givenName",
        "id",
        "updatedAt",
      ]);

      // Canonical no-op (domain case only)
      const noop = await updateOwnCustomerProfile(persistence, actor, {
        email: " Test.User@EXAMPLE.COM ",
      });
      expect(noop.updatedAt.getTime()).toBe(created.updatedAt.getTime());

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const audits = await client.pool.query(
          `select action from app.customer_profile_audit_events`,
        );
        expect(audits.rowCount).toBe(1);
        expect(audits.rows[0]?.action).toBe("profile_created");
      });

      // Material update
      const updated = await updateOwnCustomerProfile(persistence, actor, {
        givenName: "Ash",
        familyName: null,
        email: null,
      });
      expect(updated.givenName).toBe("Ash");
      expect(updated.familyName).toBeNull();
      expect(updated.email).toBeNull();
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const audits = await client.pool.query<{
          action: string;
          affected_fields: string[];
        }>(
          `select action, affected_fields from app.customer_profile_audit_events where action = 'profile_updated'`,
        );
        expect(audits.rowCount).toBe(1);
        expect(audits.rows[0]?.affected_fields.sort()).toEqual([
          "email",
          "family_name",
          "given_name",
        ]);
        const blob = JSON.stringify(audits.rows);
        expect(blob).not.toMatch(/Ashutosh|Test\.User|Joshi/i);
      });

      // Validation failure leaves state unchanged
      await expect(
        updateOwnCustomerProfile(persistence, actor, { givenName: null }),
      ).rejects.toMatchObject({ code: "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED" });
      await expect(
        updateOwnCustomerProfile(persistence, actor, { givenName: "   " }),
      ).rejects.toMatchObject({ code: "CUSTOMER_PROFILE_GIVEN_NAME_REQUIRED" });

      const beforeDelete = await getOwnCustomerProfile(persistence, actor);
      expect(beforeDelete?.givenName).toBe("Ash");

      await deleteOwnCustomerProfile(persistence, actor);
      expect(await getOwnCustomerProfile(persistence, actor)).toBeNull();

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const auth = await client.pool.query<{ phone_number: string }>(
          `select phone_number from app.customer_auth_users where id = 'cust-domain'`,
        );
        expect(auth.rows[0]?.phone_number).toBe("+919876543210");
        const audits = await client.pool.query(
          `select action from app.customer_profile_audit_events order by occurred_at`,
        );
        expect(audits.rows.map((r) => r.action)).toEqual([
          "profile_created",
          "profile_updated",
          "profile_deleted",
        ]);
      });

      await expect(deleteOwnCustomerProfile(persistence, actor)).rejects.toMatchObject({
        code: "CUSTOMER_PROFILE_NOT_FOUND",
      });

      const recreated = await createOwnCustomerProfile(persistence, actor, {
        givenName: "Again",
      });
      expect(recreated.id).not.toBe(created.id);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const audits = await client.pool.query(
          `select action, profile_id from app.customer_profile_audit_events order by occurred_at`,
        );
        expect(audits.rows.map((r) => r.action)).toEqual([
          "profile_created",
          "profile_updated",
          "profile_deleted",
          "profile_created",
        ]);
        expect(audits.rows[0]?.profile_id).toBe(created.id);
        expect(audits.rows[3]?.profile_id).toBe(recreated.id);
      });
    });
  });

  it("update requires existing Profile; reads create no audit", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-missing");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-missing");

      await expect(
        updateOwnCustomerProfile(persistence, actor, { givenName: "X" }),
      ).rejects.toMatchObject({ code: "CUSTOMER_PROFILE_NOT_FOUND" });

      await getOwnCustomerProfile(persistence, actor);
      await persistence.withContext(async (ctx) => {
        const count = await ctx.db.execute(
          sql`select count(*)::text as c from app.customer_profile_audit_events`,
        );
        expect(count.rows[0]?.c).toBe("0");
      });
    });
  });

  it("rolls back Profile mutation when audit insert fails", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      await seedAuthUser(database.connectionString, "cust-atomic");
      const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
      openHandles.push(persistence);
      const actor = customerActor("cust-atomic");

      // Force audit failure via CHECK on actor_kind by temporarily replacing insert path:
      // Drop and recreate a trigger that rejects audit inserts after first success path test —
      // simpler: revoke INSERT on audit for a brief transaction using a restricted path.
      // Use a statement trigger that raises on audit insert for this user.
      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(`
          create or replace function app.deny_profile_audit() returns trigger as $$
          begin
            raise exception 'forced audit failure';
          end;
          $$ language plpgsql;
          create trigger deny_profile_audit_trg
            before insert on app.customer_profile_audit_events
            for each row execute function app.deny_profile_audit();
        `);
      });

      await expect(
        createOwnCustomerProfile(persistence, actor, { givenName: "Atomic" }),
      ).rejects.toBeTruthy();

      expect(await getOwnCustomerProfile(persistence, actor)).toBeNull();

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(`drop trigger deny_profile_audit_trg on app.customer_profile_audit_events`);
        await client.pool.query(`drop function app.deny_profile_audit()`);
      });

      const created = await createOwnCustomerProfile(persistence, actor, { givenName: "Atomic" });

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(`
          create or replace function app.deny_profile_audit() returns trigger as $$
          begin
            raise exception 'forced audit failure';
          end;
          $$ language plpgsql;
          create trigger deny_profile_audit_trg
            before insert on app.customer_profile_audit_events
            for each row execute function app.deny_profile_audit();
        `);
      });

      await expect(
        updateOwnCustomerProfile(persistence, actor, { givenName: "Changed" }),
      ).rejects.toBeTruthy();
      expect((await getOwnCustomerProfile(persistence, actor))?.givenName).toBe("Atomic");

      await expect(deleteOwnCustomerProfile(persistence, actor)).rejects.toBeTruthy();
      expect((await getOwnCustomerProfile(persistence, actor))?.id).toBe(created.id);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        await client.pool.query(`drop trigger deny_profile_audit_trg on app.customer_profile_audit_events`);
        await client.pool.query(`drop function app.deny_profile_audit()`);
      });
    });
  });
});
