/** Public administration module entry (IMP-035). */
import "server-only";

export { AdministrationError } from "./errors";
export type { AdministrationErrorCode } from "./errors";

export {
  adminCreateBrand,
  adminCreateLegalEntity,
  adminCreateMembership,
  adminCreateOrganization,
  adminCreateOutlet,
  adminCreateTerritory,
  adminGetBrand,
  adminGetEffectivePermissions,
  adminGetLegalEntity,
  adminGetMembership,
  adminGetOrganization,
  adminGetOutlet,
  adminGetTerritory,
  adminGrantRole,
  adminListAuditEvents,
  adminListBrands,
  adminListLegalEntities,
  adminListMemberships,
  adminListOrganizations,
  adminListOutlets,
  adminListRoleAssignments,
  adminListTerritories,
  adminRevokeRole,
  adminTransitionMembership,
  adminUpdateBrand,
  adminUpdateLegalEntity,
  adminUpdateOrganization,
  adminUpdateOutlet,
  adminUpdateTerritory,
  getAdminSession,
  rejectForgedAuthorityFields,
} from "./use-cases";
