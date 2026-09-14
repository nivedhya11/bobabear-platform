/**
 * Tax / Charges inspection context (US-IMP-036F-016).
 * tax.read / charges.read only — no manage surfaces.
 */
import "server-only";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import {
  chargeDefinitionsTable,
  legalEntityTaxProfilesTable,
  outletTaxProfilesTable,
} from "../../../platform/database/schema/pricing";
import { outletsTable } from "../../../platform/database/schema/organizations";
import type { WorkforcePrincipal } from "../../access-control/principal";
import type { PersistenceQueryContext } from "../../persistence/types";
import {
  softAuthorizeBrandPermission,
  unavailableSection,
} from "./soft-auth";
import type { ComposedSection } from "./types";

export async function inspectTaxChargesContext(
  context: PersistenceQueryContext,
  input: Readonly<{
    actor: WorkforcePrincipal;
    brandId: string;
    outletId: string | null;
    at: Date;
  }>,
): Promise<ComposedSection<Readonly<Record<string, unknown>>>> {
  const canTax = await softAuthorizeBrandPermission(
    context,
    input.actor,
    input.brandId,
    "tax.read",
  );
  const canCharges = await softAuthorizeBrandPermission(
    context,
    input.actor,
    input.brandId,
    "charges.read",
  );

  if (!canTax && !canCharges) {
    return unavailableSection(canTax ? "charges.read" : "tax.read");
  }

  let tax: Record<string, unknown> | null = null;
  if (canTax) {
    if (!input.outletId) {
      tax = {
        state: "insufficient_authorized_context",
        explanation: "Outlet context is required for outlet tax profile inspection.",
      };
    } else {
      const outletRows = await context.db
        .select({ id: outletsTable.id, brandId: outletsTable.brandId })
        .from(outletsTable)
        .where(eq(outletsTable.id, input.outletId))
        .limit(1);
      const outlet = outletRows[0];
      if (!outlet || outlet.brandId !== input.brandId) {
        tax = { state: "not_found_safe", explanation: "Outlet tax context unavailable." };
      } else {
        const mappingRows = await context.db
          .select()
          .from(outletTaxProfilesTable)
          .where(
            and(
              eq(outletTaxProfilesTable.outletId, outlet.id),
              eq(outletTaxProfilesTable.lifecycleStatus, "active"),
              lte(outletTaxProfilesTable.effectiveFrom, input.at),
              or(
                isNull(outletTaxProfilesTable.effectiveTo),
                sql`${outletTaxProfilesTable.effectiveTo} > ${input.at}`,
              ),
            ),
          )
          .limit(2);
        if (mappingRows.length !== 1) {
          tax = {
            mapped: false,
            explanation:
              mappingRows.length === 0
                ? "No effective outlet tax profile mapping."
                : "Ambiguous overlapping tax profile mappings.",
          };
        } else {
          const profileRows = await context.db
            .select({
              id: legalEntityTaxProfilesTable.id,
              registrationStatus: legalEntityTaxProfilesTable.registrationStatus,
              stateCode: legalEntityTaxProfilesTable.stateCode,
              lifecycleStatus: legalEntityTaxProfilesTable.lifecycleStatus,
            })
            .from(legalEntityTaxProfilesTable)
            .where(
              eq(
                legalEntityTaxProfilesTable.id,
                mappingRows[0]!.legalEntityTaxProfileId,
              ),
            )
            .limit(1);
          const profile = profileRows[0];
          tax = {
            mapped: true,
            taxProfileId: profile?.id ?? null,
            registrationStatus: profile?.registrationStatus ?? null,
            stateCode: profile?.stateCode ?? null,
            lifecycleStatus: profile?.lifecycleStatus ?? null,
            foldedIntoCatalogOrPricing: false,
          };
        }
      }
    }
  } else {
    tax = { state: "unavailable_to_inspect" };
  }

  let charges: Record<string, unknown> | null = null;
  if (canCharges) {
    const defs = await context.db
      .select({
        id: chargeDefinitionsTable.id,
        code: chargeDefinitionsTable.code,
        name: chargeDefinitionsTable.name,
        lifecycleStatus: chargeDefinitionsTable.lifecycleStatus,
      })
      .from(chargeDefinitionsTable)
      .limit(25);
    charges = {
      definitions: defs,
      manageNotExposed: true,
      foldedIntoCatalogOrPricing: false,
    };
  } else {
    charges = { state: "unavailable_to_inspect" };
  }

  return {
    state: "available",
    permission: canTax && canCharges ? "tax.read+charges.read" : canTax ? "tax.read" : "charges.read",
    explanation: "Tax/Charges inspection context only — no administration surfaces.",
    data: {
      tax: canTax ? tax : { state: "unavailable_to_inspect" },
      charges: canCharges ? charges : { state: "unavailable_to_inspect" },
      taxManageExposed: false,
      chargesManageExposed: false,
    },
  };
}
