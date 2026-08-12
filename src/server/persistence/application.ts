/**
 * Application-role persistence factory (IMP-006).
 *
 * The only way ordinary runtime application code should reach PostgreSQL.
 * Accepts exactly a `WebConfig` or `WorkerConfig` from the centralized
 * configuration boundary — never a raw connection string, never a role
 * name string, never the migration or bootstrap/admin configuration shape.
 */
import type { WebConfig, WorkerConfig } from "../../platform/config";
import { PersistenceConfigurationError } from "./errors";
import { createPersistenceHandle } from "./handle";
import type { Persistence } from "./types";

export type ApplicationPersistenceConfig = WebConfig | WorkerConfig;

const registry = new WeakMap<ApplicationPersistenceConfig, Persistence>();

function assertApplicationConfig(
  config: ApplicationPersistenceConfig,
): void {
  if (config.processKind !== "web" && config.processKind !== "worker") {
    throw new PersistenceConfigurationError({
      role: "application",
      message:
        `getApplicationPersistence() requires a "web" or "worker" process configuration, ` +
        `got processKind "${(config as { processKind?: string }).processKind ?? "unknown"}".`,
    });
  }
}

/**
 * Get (or lazily create) the shared application-role persistence handle for
 * `config`. Calling this repeatedly with the *same* configuration object
 * returns the same handle and reuses its pool; a different configuration
 * object — even with identical field values — gets its own handle.
 *
 * Never connects to PostgreSQL by itself. Never accepts a raw connection
 * string, a bootstrap/admin configuration, or a role name chosen by the
 * caller.
 */
export function getApplicationPersistence(config: ApplicationPersistenceConfig): Persistence {
  assertApplicationConfig(config);

  const existing = registry.get(config);
  if (existing) return existing;

  const handle = createPersistenceHandle({
    role: "application",
    connectionString: config.databaseUrl,
    sslMode: config.databaseSslMode,
    applicationName: "boba-bear-persistence-app",
    onClose: () => registry.delete(config),
  });
  registry.set(config, handle);
  return handle;
}
