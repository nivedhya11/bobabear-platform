#!/usr/bin/env -S node --conditions=react-server --import tsx
/** Test-only IMP-036F F6B commercial workspace fixtures for the isolated Compose database. */
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { sql } from "drizzle-orm";

import { createMembership, grantRole } from "../../src/server/access-control";
import { createWorkforceOperatorAuthRuntime, createWorkforceOperatorUser } from "../../src/server/auth/workforce/operator";
import { loadAuthFoundationConfig } from "../../src/server/auth/shared/config";
import { getApplicationPersistence } from "../../src/server/persistence";
import { loadConfig } from "../../src/platform/config";
import { seedCustomerOrderingCommerce } from "./seed-customer-ordering";

const manifestPath = process.env.COMMERCIAL_E2E_FIXTURE_MANIFEST;
const email = process.env.WORKFORCE_E2E_EMAIL;
const temporaryPassword = process.env.WORKFORCE_E2E_TEMP_PASSWORD;
if (!manifestPath || !email || !temporaryPassword) {
  throw new Error("Missing private commercial E2E fixture configuration.");
}
const fixtureManifestPath: string = manifestPath;
const workforceEmail: string = email;
const workforceTemporaryPassword: string = temporaryPassword;

async function main() {
  const config = loadConfig({ processKind: "worker", source: process.env });
  const commerce = await seedCustomerOrderingCommerce(config);
  const persistence = getApplicationPersistence(config);
  const auth = loadAuthFoundationConfig(process.env, "test").workforce;
  const runtime = createWorkforceOperatorAuthRuntime({ auth, persistence: config });
  try {
    const labels = await persistence.withContext(async (ctx) => {
      const brandResult = await ctx.db.execute<{ name: string }>(sql`
        select name from app.brands where id = ${commerce.brandId}::uuid
      `);
      const outletResult = await ctx.db.execute<{ name: string }>(sql`
        select name from app.outlets where id = ${commerce.outletId}::uuid
      `);
      const catalogResult = await ctx.db.execute<{
        product_id: string;
        product_code: string;
        variant_id: string;
        variant_code: string;
      }>(sql`
        select
          p.id as product_id,
          p.code as product_code,
          v.id as variant_id,
          v.code as variant_code
        from app.catalog_variants v
        join app.catalog_products p on p.id = v.product_id
        where p.brand_id = ${commerce.brandId}::uuid
          and v.lifecycle_status = 'active'
        order by p.code, v.code
        limit 1
      `);
      const brandName = brandResult.rows[0]?.name;
      const outletName = outletResult.rows[0]?.name;
      if (!brandName || !outletName) throw new Error("Seeded brand/outlet labels missing.");
      const catalog = catalogResult.rows[0];
      return {
        brandName,
        outletName,
        productId: catalog?.product_id ?? null,
        productName: catalog?.product_code ?? null,
        variantId: catalog?.variant_id ?? null,
        variantName: catalog?.variant_code ?? null,
      };
    });

    const operator = await createWorkforceOperatorUser(runtime, {
      email: workforceEmail,
      name: "Commercial E2E Brand Admin",
      temporaryPassword: workforceTemporaryPassword,
    });
    await persistence.transaction(async (tx) => {
      const membership = await createMembership(tx, {
        workforceUserId: operator.userId,
        status: "active",
        scope: { scopeType: "brand", brandId: commerce.brandId },
      });
      await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
    });

    await writeFile(
      fixtureManifestPath,
      JSON.stringify({
        email: workforceEmail,
        brandId: commerce.brandId,
        brandName: labels.brandName,
        outletId: commerce.outletId,
        outletName: labels.outletName,
        ...(labels.productId
          ? {
              productId: labels.productId,
              productName: labels.productName,
              variantId: labels.variantId,
              variantName: labels.variantName,
            }
          : {}),
      }),
      { mode: 0o600 },
    );
  } finally {
    await runtime.close();
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `commercial workspace seed failed: ${error instanceof Error ? error.message : "unknown"}\n`,
  );
  process.exitCode = 1;
});
