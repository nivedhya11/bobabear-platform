/**
 * Public entry point for the Organization module (IMP-011).
 *
 * Owns Brand / Organization / Territory / Legal Entity / Outlet writes.
 * Soft lifecycle only — no hard delete. Audit events are written through
 * `insertAccessAuditEvent` in the same transaction as each successful
 * create/update.
 */
import "server-only";

export {
  OrganizationConflictError,
  OrganizationNotFoundError,
  OrganizationValidationError,
} from "./errors";
export type { OrganizationErrorCode } from "./errors";

export type {
  Brand,
  CreateBrandInput,
  CreateLegalEntityInput,
  CreateOrganizationInput,
  CreateOutletInput,
  CreateTerritoryInput,
  LegalEntity,
  Organization,
  Outlet,
  Territory,
  UpdateBrandInput,
  UpdateLegalEntityInput,
  UpdateOrganizationInput,
  UpdateOutletInput,
  UpdateTerritoryInput,
} from "./types";

export { createBrand, findBrandById, updateBrand } from "./brands";
export {
  createOrganization,
  findOrganizationById,
  updateOrganization,
} from "./organizations";
export { createTerritory, findTerritoryById, updateTerritory } from "./territories";
export {
  createLegalEntity,
  findLegalEntityById,
  updateLegalEntity,
} from "./legal-entities";
export { createOutlet, findOutletById, updateOutlet } from "./outlets";
export {
  listBrands,
  listLegalEntities,
  listOrganizations,
  listOutlets,
  listTerritories,
} from "./queries";
