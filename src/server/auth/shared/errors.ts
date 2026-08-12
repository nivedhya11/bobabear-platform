/**
 * Secret-safe Better Auth foundation errors (IMP-008).
 *
 * Same convention as `src/platform/config`'s `ConfigurationError` and
 * `src/server/persistence`'s `PersistenceError` family: never a secret, base
 * URL, database URL, session token, cookie value, or raw Better Auth/
 * PostgreSQL error — only a stable code, realm, and safe metadata.
 */
import type { SafeConfigIssue } from "../../../platform/config";

export type AuthRealm = "customer" | "workforce";

function formatIssues(issues: readonly SafeConfigIssue[]): string {
  if (issues.length === 0) {
    return "Invalid Better Auth foundation configuration.";
  }
  const lines = issues.map((issue) => `- ${issue.key}: ${issue.message}`);
  return ["Invalid Better Auth foundation configuration:", ...lines].join("\n");
}

/** One or more of `CUSTOMER_AUTH_SECRET` / `CUSTOMER_AUTH_BASE_URL` /
 * `WORKFORCE_AUTH_SECRET` / `WORKFORCE_AUTH_BASE_URL` is missing, malformed,
 * a known placeholder, or otherwise unsafe. Never carries the raw value. */
export class AuthFoundationConfigurationError extends Error {
  readonly issues: readonly SafeConfigIssue[];

  constructor(issues: readonly SafeConfigIssue[]) {
    super(formatIssues(issues));
    this.name = "AuthFoundationConfigurationError";
    this.issues = issues;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, AuthFoundationConfigurationError);
    }
  }

  toSafeJSON(): { name: string; message: string; issues: SafeConfigIssue[] } {
    return {
      name: this.name,
      message: this.message,
      issues: this.issues.map((issue) => ({ ...issue })),
    };
  }
}

interface BaseAuthErrorDetails {
  readonly realm: AuthRealm;
  readonly message: string;
}

abstract class AuthFoundationError extends Error {
  readonly realm: AuthRealm;

  protected constructor(name: string, details: BaseAuthErrorDetails) {
    super(details.message);
    this.name = name;
    this.realm = details.realm;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, AuthFoundationError);
    }
  }

  toSafeJSON(): { name: string; message: string; realm: AuthRealm } {
    return { name: this.name, message: this.message, realm: this.realm };
  }
}

/** A configuration for one realm was passed to the other realm's runtime
 * factory. Always fails closed — checked at runtime via the `realm`
 * discriminant, not only by TypeScript's type system. */
export class AuthRealmMismatchError extends AuthFoundationError {
  constructor(details: BaseAuthErrorDetails & { readonly expectedRealm: AuthRealm }) {
    super("AuthRealmMismatchError", details);
    this.expectedRealm = details.expectedRealm;
  }

  readonly expectedRealm: AuthRealm;
}

/** An operation was attempted on a realm runtime handle that has already
 * been closed. */
export class AuthRuntimeClosedError extends AuthFoundationError {
  constructor(realm: AuthRealm) {
    super("AuthRuntimeClosedError", {
      realm,
      message: "This auth realm runtime has already been closed.",
    });
  }
}

/** The realm's Better Auth instance or its database adapter could not be
 * initialized. */
export class AuthRuntimeInitializationError extends AuthFoundationError {
  constructor(details: BaseAuthErrorDetails) {
    super("AuthRuntimeInitializationError", details);
  }
}

/** The realm's application persistence handle is unavailable. Never carries
 * the underlying database error's connection detail. */
export class AuthPersistenceUnavailableError extends AuthFoundationError {
  constructor(details: BaseAuthErrorDetails) {
    super("AuthPersistenceUnavailableError", details);
  }
}
