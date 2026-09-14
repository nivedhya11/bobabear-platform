/**
 * Authorized commercial activity composition (audit reads only).
 * MUTABLE_COMMERCIAL_AUDIT_AUTHORITY = NO
 */
import "server-only";

import { listBrandPromotionAuditEvents } from "../../promotions/commercial-reads";
import type { PersistenceQueryContext } from "../../persistence/types";
import {
  listBrandAssortmentAuditEvents,
  listBrandCatalogAuditEvents,
  listBrandMenuAuditEvents,
  listBrandPricingAuditEvents,
} from "./audit-reads";
import {
  assertCommercialUuid,
  requireAnyBrandCommercialRead,
  softAuthorizeBrandPermission,
} from "./soft-auth";
import type { CommercialActivityDomain, CommercialActivityEvent } from "./types";

export type CommercialActivityResult = Readonly<{
  brandId: string;
  events: readonly CommercialActivityEvent[];
  omittedDomains: readonly {
    domain: CommercialActivityDomain;
    reason: "unavailable_to_inspect";
  }[];
  mutableCommercialAuditAuthority: false;
}>;

export async function composeCommercialActivity(
  context: PersistenceQueryContext,
  input: Readonly<{ actor: unknown; brandId: string; limitPerDomain?: number }>,
): Promise<CommercialActivityResult> {
  const brandId = assertCommercialUuid(input.brandId, "brandId");
  const principal = await requireAnyBrandCommercialRead(context, input.actor, brandId);
  const limit = input.limitPerDomain ?? 25;
  const events: CommercialActivityEvent[] = [];
  const omittedDomains: Array<{
    domain: CommercialActivityDomain;
    reason: "unavailable_to_inspect";
  }> = [];

  const canCatalog = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "catalog.read",
  );
  if (canCatalog) {
    const rows = await listBrandCatalogAuditEvents(context, {
      actor: principal,
      brandId,
      limit,
    });
    for (const row of rows) {
      events.push({
        domain: "catalog",
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorWorkforceUserId: row.actorWorkforceUserId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        brandId: row.brandId,
        outletId: row.outletId,
        metadata: row.metadata,
      });
    }
  } else {
    omittedDomains.push({ domain: "catalog", reason: "unavailable_to_inspect" });
  }

  const canMenu = await softAuthorizeBrandPermission(context, principal, brandId, "menu.read");
  if (canMenu) {
    const rows = await listBrandMenuAuditEvents(context, {
      actor: principal,
      brandId,
      limit,
    });
    for (const row of rows) {
      events.push({
        domain: "menu",
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorWorkforceUserId: row.actorWorkforceUserId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        brandId: row.brandId,
        outletId: row.outletId,
        metadata: row.metadata,
      });
    }
  } else {
    omittedDomains.push({ domain: "menu", reason: "unavailable_to_inspect" });
  }

  const canAssortmentAudit = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "assortment.audit.read",
  );
  if (canAssortmentAudit) {
    const rows = await listBrandAssortmentAuditEvents(context, {
      actor: principal,
      brandId,
      limit,
    });
    for (const row of rows) {
      events.push({
        domain: "assortment",
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorWorkforceUserId: row.actorWorkforceUserId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        brandId: row.brandId,
        outletId: row.outletId,
        metadata: row.metadata,
      });
    }
  } else {
    omittedDomains.push({ domain: "assortment", reason: "unavailable_to_inspect" });
  }

  const canPricingAudit = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "pricing.audit.read",
  );
  if (canPricingAudit) {
    const rows = await listBrandPricingAuditEvents(context, {
      actor: principal,
      brandId,
      limit,
    });
    for (const row of rows) {
      const isTariff =
        typeof row.action === "string" &&
        (row.action.includes("tariff") ||
          row.resourceType === "delivery_tariff" ||
          row.resourceType === "outlet_delivery_tariff");
      events.push({
        domain: isTariff ? "delivery_tariff" : "pricing",
        id: row.id,
        occurredAt: row.occurredAt.toISOString(),
        actorWorkforceUserId: row.actorWorkforceUserId,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        brandId: row.brandId,
        outletId: row.outletId,
        metadata: row.metadata,
      });
    }
  } else {
    omittedDomains.push({ domain: "pricing", reason: "unavailable_to_inspect" });
    omittedDomains.push({ domain: "delivery_tariff", reason: "unavailable_to_inspect" });
  }

  const canPromoAudit = await softAuthorizeBrandPermission(
    context,
    principal,
    brandId,
    "promotions.audit.read",
  );
  if (canPromoAudit) {
    const listed = await listBrandPromotionAuditEvents(context, {
      actor: principal,
      brandId,
    });
    for (const row of listed.events.slice(0, limit)) {
      events.push({
        domain: "promotions",
        id: row.id,
        occurredAt: row.occurredAt,
        actorWorkforceUserId: null,
        action: row.action,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        brandId,
        outletId: null,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
      });
    }
  } else {
    omittedDomains.push({ domain: "promotions", reason: "unavailable_to_inspect" });
  }

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));

  return {
    brandId,
    events,
    omittedDomains,
    mutableCommercialAuditAuthority: false,
  };
}
