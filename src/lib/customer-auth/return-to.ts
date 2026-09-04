/**
 * Safe return-to-flow path for customer login (IMP-025).
 *
 * Only same-origin relative paths. Rejects open redirects.
 */

const MAX_LENGTH = 512;

/** Default post-auth destination when no safe returnTo is present (IMP-036C). */
export const DEFAULT_CUSTOMER_POST_AUTH_HREF = "/order/";

export function parseSafeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LENGTH) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("\0")) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(decoded) || decoded.includes("://")) {
    return null;
  }

  try {
    const url = new URL(trimmed, "https://boba.local");
    if (url.origin !== "https://boba.local") return null;
    if (url.username || url.password) return null;
    const result = `${url.pathname}${url.search}${url.hash}`;
    if (!result.startsWith("/") || result.startsWith("//")) return null;
    return result;
  } catch {
    return null;
  }
}

/** D-356 static export uses trailingSlash: true. Page paths must end with `/`. */
export function withTrailingSlash(pathWithOptionalQuery: string): string {
  const url = new URL(pathWithOptionalQuery, "https://boba.local");
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function isCustomerLoginPath(path: string): boolean {
  try {
    const url = new URL(path, "https://boba.local");
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return pathname === "/login/";
  } catch {
    return false;
  }
}

/**
 * Post-authentication navigation target (IMP-036C).
 * Honors a safe returnTo; otherwise `/order/`. Login paths fall through to
 * `/order/` so `/login/` cannot redirect into itself.
 */
export function resolveCustomerPostAuthHref(returnTo: string | null): string {
  const safe = parseSafeReturnPath(returnTo);
  if (!safe || isCustomerLoginPath(safe)) {
    return DEFAULT_CUSTOMER_POST_AUTH_HREF;
  }
  return withTrailingSlash(safe);
}

/**
 * Global Nav Sign In href that preserves a meaningful customer route as
 * returnTo when safe. Generic / non-customer routes keep plain `/login/`.
 */
export function signInHrefForPath(pathname: string): string {
  const safe = parseSafeReturnPath(pathname);
  if (!safe || isCustomerLoginPath(safe)) return "/login/";
  try {
    const url = new URL(safe, "https://boba.local");
    const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    if (path.startsWith("/order/") || path.startsWith("/account/")) {
      return loginUrlWithReturn(safe);
    }
  } catch {
    return "/login/";
  }
  return "/login/";
}

export function loginUrlWithReturn(returnPath: string): string {
  const safe = parseSafeReturnPath(returnPath);
  if (!safe) return "/login";
  return `/login?returnTo=${encodeURIComponent(withTrailingSlash(safe))}`;
}
