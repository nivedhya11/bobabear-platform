/** Operations process configuration (IMP-029). */
import "server-only";

import type { AppEnvironment } from "../../platform/config";
import { validateWorkforceAuthConfig } from "../auth/shared/config";
import { AuthFoundationConfigurationError } from "../auth/shared/errors";
import type { WorkforceAuthConfig } from "../auth/shared/types";

export type OperationsEnvSource = Readonly<Record<string, string | undefined>>;

export type OperationsConfig = Readonly<{
  environmentType: AppEnvironment;
  auth: WorkforceAuthConfig;
  trustedOrigin: string;
  serviceHost: string;
  servicePort: number;
}>;

export class OperationsConfigurationError extends Error {
  readonly issues: readonly Readonly<{ key: string; message: string }>[];

  constructor(issues: readonly Readonly<{ key: string; message: string }>[]) {
    super(["Invalid Operations configuration:", ...issues.map((issue) => `- ${issue.key}: ${issue.message}`)].join("\n"));
    this.name = "OperationsConfigurationError";
    this.issues = issues;
  }
}

function parsePort(raw: string | undefined): { ok: true; value: number } | { ok: false; message: string } {
  const value = raw === undefined || raw.length === 0 ? "8084" : raw;
  if (!/^\d+$/.test(value)) return { ok: false, message: "Must be a decimal integer between 1 and 65535." };
  const parsed = Number.parseInt(value, 10);
  return parsed >= 1 && parsed <= 65535
    ? { ok: true, value: parsed }
    : { ok: false, message: "Must be a decimal integer between 1 and 65535." };
}

export function loadOperationsConfig(source: OperationsEnvSource, environmentType: AppEnvironment): OperationsConfig {
  const workforceResult = validateWorkforceAuthConfig(source, environmentType);
  if (!workforceResult.ok) throw new AuthFoundationConfigurationError(workforceResult.issues);
  const auth = workforceResult.config;
  const host = source.OPERATIONS_SERVICE_HOST === undefined || source.OPERATIONS_SERVICE_HOST.length === 0
    ? "0.0.0.0"
    : source.OPERATIONS_SERVICE_HOST;
  const port = parsePort(source.OPERATIONS_SERVICE_PORT);
  const issues: Array<{ key: string; message: string }> = [];
  if (host.length === 0 || host.trim() !== host) {
    issues.push({ key: "OPERATIONS_SERVICE_HOST", message: "Must be a non-empty host without surrounding whitespace." });
  }
  if (!port.ok) issues.push({ key: "OPERATIONS_SERVICE_PORT", message: port.message });
  if (issues.length > 0) throw new OperationsConfigurationError(issues);
  return Object.freeze({
    environmentType,
    auth,
    trustedOrigin: auth.baseURL.origin,
    serviceHost: host,
    servicePort: (port as { ok: true; value: number }).value,
  });
}
