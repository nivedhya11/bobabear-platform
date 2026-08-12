/**
 * Safe startup-state projection.
 *
 * The startup state is intentionally tiny and value-free: it exists so a
 * later server-capable slice can implement `/health/ready` correctly
 * without this slice having to build that endpoint or leak anything in
 * the meantime.
 */
import type { SafeConfigSummary } from "../config/summary";

export type StartupPhase = "not_started" | "starting" | "ready" | "failed";

export interface SafeStartupFailure {
  readonly code: string;
  readonly message: string;
  readonly failedAt: string;
}

export interface StartupStatus {
  readonly phase: StartupPhase;
  readonly summary: SafeConfigSummary | null;
  readonly failure: SafeStartupFailure | null;
}

export const NOT_STARTED_STATUS: StartupStatus = Object.freeze({
  phase: "not_started",
  summary: null,
  failure: null,
});
