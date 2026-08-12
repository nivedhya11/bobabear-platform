/**
 * Pure configuration loader.
 *
 * `loadConfig` is a deterministic function of its explicit input. It never
 * touches `process.env`, never caches, and never mutates anything — it is
 * the piece unit tests exercise directly. Runtime callers (the actual
 * process) go through `runtime-config.ts` instead.
 */
import { ConfigurationError } from "./config-error";
import { validateSource } from "./schema";
import type { AppConfig, ConfigFor, EnvSource, ProcessKind } from "./types";

export interface LoadConfigInput<K extends ProcessKind> {
  readonly processKind: K;
  readonly source: EnvSource;
}

/** Deep-freeze a plain object. Configuration values are all primitives, so
 * a single level of `Object.freeze` is sufficient, but freezing is applied
 * defensively in case a field grows structure in a later slice. */
function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value as Readonly<T>;
}

/**
 * Validate `source` against the full BOBA Bear configuration contract for
 * `processKind` and return an immutable, typed configuration object.
 *
 * Throws a single {@link ConfigurationError} (never a raw Zod error, never
 * anything carrying the source object) when validation fails.
 */
export function loadConfig<K extends ProcessKind>({
  processKind,
  source,
}: LoadConfigInput<K>): ConfigFor<K> {
  const result = validateSource({ processKind, source });
  if (!result.ok) {
    throw new ConfigurationError(result.issues);
  }
  return deepFreeze(result.config) as ConfigFor<K>;
}

export type { AppConfig };
