/**
 * Application startup bootstrap.
 *
 * `bootstrapApplication(processKind)` is the single entry point a process
 * calls once at start. It is idempotent within a process: repeated or
 * concurrent calls with the same process kind share one initialization and
 * resolve to the same configuration.
 *
 * This module deliberately does nothing beyond configuration validation —
 * no provider calls, no database connections, no background jobs, no
 * migrations. Those belong to later slices.
 */
import { getRuntimeConfig } from "../config/runtime-config";
import { ConfigurationError } from "../config/config-error";
import { formatSafeSummary, toSafeSummary } from "../config/summary";
import type { AppConfig, ProcessKind } from "../config/types";
import {
  NOT_STARTED_STATUS,
  type SafeStartupFailure,
  type StartupStatus,
} from "./startup-state";

interface BootstrapSlot {
  processKind: ProcessKind;
  status: StartupStatus;
  promise: Promise<AppConfig>;
}

// globalThis-backed singleton: survives Next.js dev-mode module reloads and
// gives concurrent callers within one process one shared initialization.
const BOOTSTRAP_SLOT = Symbol.for("boba-bear.platform.startup-bootstrap");

type GlobalWithSlot = typeof globalThis & {
  [BOOTSTRAP_SLOT]?: BootstrapSlot;
};

function getSlot(): BootstrapSlot | undefined {
  return (globalThis as GlobalWithSlot)[BOOTSTRAP_SLOT];
}

function setSlot(slot: BootstrapSlot): void {
  (globalThis as GlobalWithSlot)[BOOTSTRAP_SLOT] = slot;
}

function toSafeFailure(error: unknown): SafeStartupFailure {
  const failedAt = new Date().toISOString();
  if (error instanceof ConfigurationError) {
    return { code: "invalid_configuration", message: error.message, failedAt };
  }
  return { code: "startup_failed", message: "Application startup failed.", failedAt };
}

/**
 * Initialize the application for `processKind`. Safe to call more than
 * once and safe to call concurrently — every caller shares one
 * initialization promise and either all resolve to the same config or all
 * reject with the same safe error.
 *
 * A process may only ever bootstrap as one process kind; calling this
 * again with a different process kind throws without touching the
 * existing state.
 */
export function bootstrapApplication<K extends ProcessKind>(
  processKind: K,
): Promise<AppConfig> {
  const existing = getSlot();
  if (existing) {
    if (existing.processKind !== processKind) {
      return Promise.reject(
        new Error(
          `Application already bootstrapped as process kind "${existing.processKind}"; ` +
            `cannot re-bootstrap as "${processKind}".`,
        ),
      );
    }
    return existing.promise;
  }

  // The slot is created and installed *before* any async work starts, and
  // the async work below closes over this exact object (rather than
  // re-reading it via getSlot()). getRuntimeConfig() below is synchronous,
  // so without this ordering the "ready"/"failed" state update could race
  // ahead of setSlot() ever running.
  const slot: BootstrapSlot = {
    processKind,
    status: { phase: "starting", summary: null, failure: null },
    // Replaced immediately below; only `undefined` for the instant between
    // object creation and assignment.
    promise: undefined as unknown as Promise<AppConfig>,
  };
  setSlot(slot);

  slot.promise = (async () => {
    const config = getRuntimeConfig(processKind);
    slot.status = {
      phase: "ready",
      summary: toSafeSummary(config),
      failure: null,
    };
    // Exactly one concise safe line per process initialization.
    console.log(formatSafeSummary(config));
    return config;
  })().catch((error: unknown) => {
    slot.status = { phase: "failed", summary: null, failure: toSafeFailure(error) };
    // Startup failures must not be swallowed — rethrow after recording safe
    // state so the caller (and the process) still observes the failure.
    throw error;
  });

  return slot.promise;
}

/** Read-only safe projection of current startup state, for future health
 * endpoints. Never contains raw environment values or unsanitized errors. */
export function getStartupStatus(): StartupStatus {
  return getSlot()?.status ?? NOT_STARTED_STATUS;
}

/** Test-only escape hatch: clear bootstrap state between test cases. */
export function resetStartupForTests(): void {
  delete (globalThis as GlobalWithSlot)[BOOTSTRAP_SLOT];
}
