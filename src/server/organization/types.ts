/**
 * Organization module domain types (IMP-011).
 */
import type { ResourceLifecycleStatus } from "../../shared/access-control";

export type Brand = Readonly<{
  id: string;
  code: string;
  name: string;
  status: ResourceLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type Organization = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  status: ResourceLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type Territory = Readonly<{
  id: string;
  brandId: string;
  code: string;
  name: string;
  status: ResourceLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type LegalEntity = Readonly<{
  id: string;
  brandId: string;
  organizationId: string;
  code: string;
  name: string;
  status: ResourceLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type Outlet = Readonly<{
  id: string;
  brandId: string;
  organizationId: string;
  territoryId: string;
  legalEntityId: string;
  code: string;
  name: string;
  status: ResourceLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateBrandInput = Readonly<{
  code: string;
  name: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type UpdateBrandInput = Readonly<{
  brandId: string;
  name?: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type CreateOrganizationInput = Readonly<{
  brandId: string;
  code: string;
  name: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type UpdateOrganizationInput = Readonly<{
  organizationId: string;
  name?: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type CreateTerritoryInput = Readonly<{
  brandId: string;
  code: string;
  name: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type UpdateTerritoryInput = Readonly<{
  territoryId: string;
  name?: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type CreateLegalEntityInput = Readonly<{
  brandId: string;
  organizationId: string;
  code: string;
  name: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type UpdateLegalEntityInput = Readonly<{
  legalEntityId: string;
  name?: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type CreateOutletInput = Readonly<{
  brandId: string;
  organizationId: string;
  territoryId: string;
  legalEntityId: string;
  code: string;
  name: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;

export type UpdateOutletInput = Readonly<{
  outletId: string;
  name?: string;
  status?: ResourceLifecycleStatus;
  actorWorkforceUserId?: string | null;
}>;
