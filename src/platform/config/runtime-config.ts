/**
 * Runtime configuration loader.
 *
 * This is the *only* module in the application that is allowed to read
 * `process.env` for BOBA Bear application configuration (see the
 * `no-process-env` ESLint restriction and `scripts/audit-config-boundary.mjs`).
 * Every other consumer must import the typed, validated result instead.
 */
import { loadConfig } from "./load-config";
import type { AppConfig, ConfigFor, ProcessKind } from "./types";

interface RuntimeConfigSlot {
  processKind: ProcessKind;
  config: AppConfig;
}

// A globalThis-backed singleton survives Next.js dev-mode module reloads,
// which would otherwise re-evaluate this module and silently create a
// second "first" runtime config. Using a well-namespaced symbol avoids
// colliding with anything else on globalThis.
const RUNTIME_CONFIG_SLOT = Symbol.for("boba-bear.platform.runtime-config");

type GlobalWithSlot = typeof globalThis & {
  [RUNTIME_CONFIG_SLOT]?: RuntimeConfigSlot;
};

function getGlobalSlot(): RuntimeConfigSlot | undefined {
  return (globalThis as GlobalWithSlot)[RUNTIME_CONFIG_SLOT];
}

function setGlobalSlot(slot: RuntimeConfigSlot): void {
  (globalThis as GlobalWithSlot)[RUNTIME_CONFIG_SLOT] = slot;
}

/**
 * Return the validated, immutable, cached configuration for `processKind`.
 *
 * Validates and caches on first call. Subsequent calls with the *same*
 * process kind return the cached instance. A call with a *different*
 * process kind than the one already initialized throws — one process is
 * one process kind for its whole lifetime.
 */
export function getRuntimeConfig<K extends ProcessKind>(
  processKind: K,
): ConfigFor<K> {
  const existing = getGlobalSlot();
  if (existing) {
    if (existing.processKind !== processKind) {
      throw new Error(
        `Runtime configuration was already initialized as process kind "${existing.processKind}"; ` +
          `cannot re-initialize as "${processKind}".`,
      );
    }
    return existing.config as ConfigFor<K>;
  }

  const config = loadConfig({ processKind, source: process.env });
  setGlobalSlot({ processKind, config });
  return config as ConfigFor<K>;
}

/** Test-only escape hatch: clear the cached runtime configuration. */
export function resetRuntimeConfigForTests(): void {
  delete (globalThis as GlobalWithSlot)[RUNTIME_CONFIG_SLOT];
}
