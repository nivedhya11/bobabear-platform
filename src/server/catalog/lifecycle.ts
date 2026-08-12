import type { CatalogLifecycleStatus } from "../../shared/catalog";
import { CatalogInvalidStateError, CatalogValidationError } from "./errors";

const ALLOWED_TRANSITIONS: Readonly<
  Record<CatalogLifecycleStatus, readonly CatalogLifecycleStatus[]>
> = {
  draft: ["active", "retired"],
  active: ["retired"],
  retired: [],
};

export function assertCanTransition(
  from: CatalogLifecycleStatus,
  to: CatalogLifecycleStatus,
): void {
  if (from === to) {
    throw new CatalogInvalidStateError({
      message: `Catalog entity is already ${to}.`,
    });
  }
  if (!(ALLOWED_TRANSITIONS[from] as readonly string[]).includes(to)) {
    throw new CatalogInvalidStateError({
      message: `Cannot transition catalog lifecycle from ${from} to ${to}.`,
    });
  }
}

export type ActivationTimestamps = Readonly<{
  lifecycleStatus: "active";
  activatedAt: Date;
  retiredAt: null;
  updatedAt: Date;
}>;

export type RetirementTimestamps = Readonly<{
  lifecycleStatus: "retired";
  activatedAt: Date | null;
  retiredAt: Date;
  updatedAt: Date;
}>;

export function activationTimestamps(now: Date = new Date()): ActivationTimestamps {
  return {
    lifecycleStatus: "active",
    activatedAt: now,
    retiredAt: null,
    updatedAt: now,
  };
}

/**
 * Retirement preserves a prior `activatedAt` when the entity was active;
 * draft→retired leaves `activatedAt` null.
 */
export function retirementTimestamps(
  from: CatalogLifecycleStatus,
  currentActivatedAt: Date | null,
  now: Date = new Date(),
): RetirementTimestamps {
  if (from === "retired") {
    throw new CatalogInvalidStateError({ message: "Catalog entity is already retired." });
  }
  return {
    lifecycleStatus: "retired",
    activatedAt: from === "active" ? currentActivatedAt : null,
    retiredAt: now,
    updatedAt: now,
  };
}

export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CatalogValidationError({ message: `${field} must be a non-empty string.` });
  }
  return value;
}
