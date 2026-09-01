/**
 * Browser-public configuration boundary.
 *
 * This module owns the *only* approved allowlist of `NEXT_PUBLIC_*`
 * variables. The allowlist is empty for IMP-003: no BOBA Bear server
 * configuration field (environment, origin, release, log level, adapter
 * safeguards, port, ...) is browser-visible.
 *
 * Adding a browser-visible value later requires, per ADR-015: a schema
 * entry, an allowlist entry here, tests, documentation, and a security
 * review of its build-time exposure. None of that exists yet, so
 * `resolvePublicConfig` always returns `{}`.
 */
import type { EnvSource } from "./types";

/** The approved `NEXT_PUBLIC_*` allowlist. Empty by design in this slice. */
export const PUBLIC_ALLOWLIST: ReadonlySet<string> = new Set([]);

/**
 * Pre-existing, out-of-scope `NEXT_PUBLIC_*` variables that predate this
 * configuration boundary (GA measurement ID and canonical site URL — see
 * `src/lib/site.ts`, `src/components/Analytics.tsx`, and
 * `.github/workflows/deploy.yml`). They are not part of the new BOBA Bear
 * public-config contract: this module does not validate them against
 * {@link PUBLIC_ALLOWLIST} (so the existing deploy workflow keeps working)
 * and does not surface them through {@link PublicConfig} either (so the
 * "initial public config resolves to {}" contract holds exactly). Any
 * *other* undeclared `NEXT_PUBLIC_*` variable is still rejected.
 */
const LEGACY_NEXT_PUBLIC_KEYS: ReadonlySet<string> = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
  "NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY",
]);

/** The shape of the browser-public runtime configuration. Empty in this
 * slice — every field added here must also be added to `PUBLIC_ALLOWLIST`. */
export type PublicConfig = Readonly<Record<string, never>>;

export interface PublicConfigIssue {
  readonly key: string;
  readonly message: string;
}

export type ResolvePublicConfigResult =
  | { readonly ok: true; readonly config: PublicConfig }
  | { readonly ok: false; readonly issues: readonly PublicConfigIssue[] };

/**
 * Resolve the browser-public configuration from an explicit source.
 *
 * Any `NEXT_PUBLIC_*` key present in `source` that is not in
 * {@link PUBLIC_ALLOWLIST} is reported as an issue rather than silently
 * dropped, so a typo or an unapproved addition is caught instead of
 * quietly doing nothing.
 *
 * This function does not read `process.env` itself and is not wired into
 * automatic process startup in this slice (there is no public runtime-
 * config endpoint yet). It exists so the configuration CLI and tests can
 * validate the public boundary independently of server configuration.
 */
export function resolvePublicConfig(source: EnvSource): ResolvePublicConfigResult {
  const issues: PublicConfigIssue[] = [];

  for (const key of Object.keys(source).sort()) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    if (source[key] === undefined) continue;
    if (LEGACY_NEXT_PUBLIC_KEYS.has(key)) continue;
    if (!PUBLIC_ALLOWLIST.has(key)) {
      issues.push({
        key,
        message:
          "Undeclared NEXT_PUBLIC_* variable. Browser-public exposure requires an explicit allowlist entry.",
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, config: Object.freeze({}) as PublicConfig };
}
