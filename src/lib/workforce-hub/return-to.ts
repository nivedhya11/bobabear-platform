/**
 * Safe post-login return paths for workforce authentication (IMP-036A).
 */

const WORKFORCE_PREFIX = "/workforce/";

export function withTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

export function parseSafeWorkforceReturnPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!decoded.startsWith(WORKFORCE_PREFIX)) return null;
  if (decoded.includes("://") || decoded.startsWith("//")) return null;
  if (decoded.includes("..")) return null;
  return withTrailingSlash(decoded.split("?")[0]!.split("#")[0]!);
}

export function workforceLoginUrlWithReturn(returnPath: string | null): string {
  const safe = returnPath ? parseSafeWorkforceReturnPath(returnPath) : null;
  if (!safe) return "/workforce/login/";
  return `/workforce/login/?returnTo=${encodeURIComponent(safe)}`;
}
