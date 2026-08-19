/**
 * Clean-database migration replay, idempotency, and reproducible-schema
 * validation (IMP-005) against a real, disposable PostgreSQL 18 database
 * provisioned by Testcontainers (see global-setup.ts).
 */
import { describe, expect, inject, it } from "vitest";

import { MIGRATIONS_SCHEMA, MIGRATIONS_TABLE } from "../../src/platform/database";
import { applyMigrations, withIsolatedTestDatabase, withTestDatabaseClient } from "./support/test-database";
import { captureNormalizedSchema, fingerprintSchema } from "./support/schema-introspection";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

describe("clean migration replay", () => {
  it("applies every committed migration to a fresh, empty database", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await withTestDatabaseClient(database.connectionString, async (client) => {
        const preMigration = await client.pool.query<{ nspname: string }>(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle')",
        );
        expect(preMigration.rows).toHaveLength(0);
      });

      await applyMigrations(database.connectionString);

      await withTestDatabaseClient(database.connectionString, async (client) => {
        const schemas = await client.pool.query<{ nspname: string }>(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('app', 'drizzle') ORDER BY nspname",
        );
        expect(schemas.rows.map((row) => row.nspname)).toEqual(["app", "drizzle"]);

        const migrationTable = await client.pool.query<{ exists: boolean }>(
          "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = $1 AND tablename = $2) AS exists",
          [MIGRATIONS_SCHEMA, MIGRATIONS_TABLE],
        );
        expect(migrationTable.rows[0]?.exists).toBe(true);

        const journalCount = 30; // drizzle/meta/_journal.json — kept in lockstep with the committed journal
        const historyRows = await client.pool.query<{ count: string }>(
          `SELECT COUNT(*) AS count FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE}`,
        );
        expect(Number(historyRows.rows[0]?.count)).toBe(journalCount);

        const appSchemaComment = await client.pool.query<{ comment: string | null }>(
          "SELECT obj_description('app'::regnamespace, 'pg_namespace') AS comment",
        );
        expect(appSchemaComment.rows[0]?.comment).toBe("BOBA Bear application schema");

        // IMP-007 technical tables through IMP-028 Financial Document foundation
        // (working-tree migrations 0018–0021 included; accepted inventory remains 0017).
        const tables = await client.pool.query<{ table_name: string }>(
          "SELECT table_name FROM information_schema.tables WHERE table_schema IN ('app', 'public') ORDER BY table_name",
        );
        expect(tables.rows.map((r) => r.table_name)).toEqual([
          "access_control_audit_events",
          "access_memberships",
          "access_permissions",
          "access_role_allowed_scopes",
          "access_role_assignments",
          "access_role_permissions",
          "access_roles",
          "assortment_availability_audit_events",
          "assortment_rules",
          "authorised_signer_profiles",
          "brand_promotion_policies",
          "brands",
          "cart_line_bundle_modifier_selections",
          "cart_line_bundle_selections",
          "cart_line_modifier_selections",
          "cart_lines",
          "carts",
          "catalog_bundle_group_options",
          "catalog_bundle_groups",
          "catalog_dietary_tags",
          "catalog_modifier_group_options",
          "catalog_modifier_groups",
          "catalog_modifier_option_dietary_tags",
          "catalog_modifier_options",
          "catalog_products",
          "catalog_variant_dietary_tags",
          "catalog_variant_modifier_groups",
          "catalog_variants",
          "charge_definitions",
          "checkout_delivery_destinations",
          "checkout_snapshot_charges",
          "checkout_snapshot_line_bundle_modifier_selections",
          "checkout_snapshot_line_bundle_selections",
          "checkout_snapshot_line_modifier_selections",
          "checkout_snapshot_lines",
          "checkout_snapshot_promotion_effects",
          "checkout_snapshot_tax_components",
          "checkout_snapshots",
          "checkouts",
          "customer_address_audit_events",
          "customer_addresses",
          "customer_auth_accounts",
          "customer_auth_sessions",
          "customer_auth_users",
          "customer_auth_verifications",
          "customer_otp_rate_limits",
          "customer_profile_audit_events",
          "customer_profiles",
          "financial_document_issuer_profiles",
          "financial_document_line_tax_components",
          "financial_document_lines",
          "financial_document_numbering_series",
          "financial_document_signed_artifact_objects",
          "financial_documents",
          "idempotency_records",
          "legal_entities",
          "legal_entity_tax_profiles",
          "menu_entries",
          "menu_sections",
          "menus",
          "orders",
          "organizations",
          "outbox_events",
          "outlet_modifier_option_availability",
          "outlet_operating_intervals",
          "outlet_operating_profiles",
          "outlet_serviceability_audit_events",
          "outlet_serviceability_configs",
          "outlet_serviceability_pins",
          "outlet_tax_profiles",
          "outlet_variant_availability",
          "outlets",
          "payment_attempts",
          "payment_initiation_idempotency",
          "payment_provider_event_inbox",
          "payment_provider_observations",
          "payment_provider_references",
          "payments",
          "price_book_bundle_option_prices",
          "price_book_charge_prices",
          "price_book_modifier_prices",
          "price_book_variant_prices",
          "price_books",
          "pricing_tax_audit_events",
          "promotion_audit_events",
          "promotion_benefits",
          "promotion_coupons",
          "promotion_redemption_claims",
          "promotion_targets",
          "promotions",
          "refund_provider_observations",
          "refund_provider_references",
          "refund_statutory_decisions",
          "refund_statutory_issuance_allocation_lines",
          "refund_statutory_issuance_allocation_tax_components",
          "refund_statutory_issuance_allocations",
          "refunds",
          "signature_artifacts",
          "tax_categories",
          "tax_policies",
          "tax_policy_components",
          "territories",
          "workforce_auth_accounts",
          "workforce_auth_rate_limits",
          "workforce_auth_sessions",
          "workforce_auth_two_factors",
          "workforce_auth_users",
          "workforce_auth_verifications",
        ]);
      });
    });
  });
});

describe("migration idempotency", () => {
  it("applying every migration a second time is a safe no-op", async () => {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);

      const first = await withTestDatabaseClient(database.connectionString, async (client) => {
        const historyRows = await client.pool.query(
          `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY id`,
        );
        return { history: historyRows.rows, schema: await captureNormalizedSchema(client) };
      });

      await applyMigrations(database.connectionString);

      const second = await withTestDatabaseClient(database.connectionString, async (client) => {
        const historyRows = await client.pool.query(
          `SELECT hash, created_at FROM ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ORDER BY id`,
        );
        return { history: historyRows.rows, schema: await captureNormalizedSchema(client) };
      });

      expect(second.history).toEqual(first.history);
      expect(fingerprintSchema(second.schema)).toBe(fingerprintSchema(first.schema));
    });
  });
});

describe("reproducible schema", () => {
  it("two independently-migrated databases produce an identical normalized schema", async () => {
    const adminInfo = adminConnectionInfo();

    const fingerprintOf = () =>
      withIsolatedTestDatabase(adminInfo, async (database) => {
        await applyMigrations(database.connectionString);
        return withTestDatabaseClient(database.connectionString, async (client) =>
          fingerprintSchema(await captureNormalizedSchema(client)),
        );
      });

    const [fingerprintA, fingerprintB] = await Promise.all([fingerprintOf(), fingerprintOf()]);
    expect(fingerprintB).toBe(fingerprintA);
  });
});
