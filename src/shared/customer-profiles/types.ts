/**
 * Shared Customer Profile value types (IMP-017).
 */

export type CustomerProfile = Readonly<{
  id: string;
  givenName: string;
  familyName: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CustomerProfileCreateInput = Readonly<{
  givenName: string;
  familyName?: string | null;
  email?: string | null;
}>;

export type CustomerProfileUpdateInput = Readonly<{
  givenName?: string | null;
  familyName?: string | null;
  email?: string | null;
}>;

/** Canonical persisted field state after merge + validation. */
export type CanonicalCustomerProfileFields = Readonly<{
  givenName: string;
  familyName: string | null;
  email: string | null;
}>;
