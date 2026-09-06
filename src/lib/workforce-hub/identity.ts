/**
 * Human-facing signed-in label for workforce/admin shells (IMP-036A).
 * Never promote opaque workforceUserId as primary identity.
 */

const OPAQUE_ID = /^[A-Za-z0-9_-]{20,}$/;

export function resolveSignedInLabel(input: Readonly<{
  email?: string | null;
  workforceUserId?: string | null;
}>): string {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email.includes("@") && email !== input.workforceUserId) return email;
  return "Signed in";
}

/**
 * Human-readable member label for already-authorized membership projections.
 * Prefer meaningful name, then safe email, then a neutral fallback — never an opaque UUID.
 */
export function resolveMemberLabel(input: Readonly<{
  name?: string | null;
  email?: string | null;
}>): string {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length > 0) return name;
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email.includes("@")) return email;
  return "Workforce member";
}

export function isOpaqueWorkforceUserId(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.includes("@")) return false;
  return OPAQUE_ID.test(value) || /^[0-9a-f-]{32,}$/i.test(value);
}
