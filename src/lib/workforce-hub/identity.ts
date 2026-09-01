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

export function isOpaqueWorkforceUserId(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.includes("@")) return false;
  return OPAQUE_ID.test(value) || /^[0-9a-f-]{32,}$/i.test(value);
}
