/**
 * Append-only menu mutation audit helper (IMP-036F F3A).
 */
import { randomUUID } from "node:crypto";

import {
  MENU_AUDIT_ACTIONS,
  type MenuAuditAction,
} from "../../../shared/catalog/menu";
import { menuMutationAuditEventsTable } from "../../../platform/database/schema/menu";
import type { PersistenceTransactionContext } from "../../persistence/types";
import { assertTransactionContext } from "../assert-role";
import { MenuValidationError } from "./errors";

export type InsertMenuMutationAuditEventInput = Readonly<{
  actorWorkforceUserId?: string | null;
  action: MenuAuditAction;
  brandId: string;
  menuId?: string | null;
  menuVersionId?: string | null;
  targetType: string;
  targetId?: string | null;
  previousMenuRevision?: bigint | null;
  newMenuRevision?: bigint | null;
  metadata?: Readonly<Record<string, unknown>>;
  occurredAt?: Date;
}>;

function isSafeMetadata(value: unknown): value is Record<string, unknown> {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof key !== "string" || key.length === 0) return false;
    const t = typeof entry;
    if (entry !== null && t !== "string" && t !== "number" && t !== "boolean") {
      return false;
    }
  }
  return true;
}

export async function insertMenuMutationAuditEvent(
  context: PersistenceTransactionContext,
  input: InsertMenuMutationAuditEventInput,
): Promise<{ id: string }> {
  assertTransactionContext(context, "insertMenuMutationAuditEvent");

  if (!(MENU_AUDIT_ACTIONS as readonly string[]).includes(input.action)) {
    throw new MenuValidationError({ message: "Unknown menu audit action." });
  }
  if (typeof input.brandId !== "string" || input.brandId.length === 0) {
    throw new MenuValidationError({ message: "brandId must be a non-empty string." });
  }
  if (typeof input.targetType !== "string" || input.targetType.trim().length === 0) {
    throw new MenuValidationError({ message: "targetType must be a non-empty string." });
  }
  if (!isSafeMetadata(input.metadata)) {
    throw new MenuValidationError({
      message: "audit metadata must be a flat object of safe primitive values.",
    });
  }

  const id = randomUUID();
  const occurredAt = input.occurredAt ?? new Date();

  await context.db.insert(menuMutationAuditEventsTable).values({
    id,
    occurredAt,
    actorWorkforceUserId: input.actorWorkforceUserId ?? null,
    action: input.action,
    brandId: input.brandId,
    menuId: input.menuId ?? null,
    menuVersionId: input.menuVersionId ?? null,
    targetType: input.targetType.trim(),
    targetId: input.targetId ?? null,
    previousMenuRevision: input.previousMenuRevision ?? null,
    newMenuRevision: input.newMenuRevision ?? null,
    metadata: { ...(input.metadata ?? {}) },
  });

  return { id };
}
