/**
 * Migration-role persistence factory (IMP-006).
 *
 * The only way migration tooling should reach PostgreSQL through this
 * boundary. Accepts exactly a `MigrationConfig` — never a raw connection
 * string, never a role name string, never the application or
 * bootstrap/admin configuration shape.
 *
 * There is no exported factory for the bootstrap/admin role anywhere in
 * this module or its siblings — that role exists only for the Postgres
 * container's own `docker/postgres/init/` scripts and the test harness's
 * isolated-database setup (see AGENTS.md), never as a public persistence
 * API.
 */
import type { MigrationConfig } from "../../platform/config";
import { PersistenceConfigurationError } from "./errors";
import { createPersistenceHandle } from "./handle";
import type { Persistence } from "./types";

export type MigrationPersistenceConfig = MigrationConfig;

const registry = new WeakMap<MigrationPersistenceConfig, Persistence>();

function assertMigrationConfig(config: MigrationPersistenceConfig): void {
  if (config.processKind !== "migration") {
    throw new PersistenceConfigurationError({
      role: "migration",
      message:
        `getMigrationPersistence() requires a "migration" process configuration, ` +
        `got processKind "${(config as { processKind?: string }).processKind ?? "unknown"}".`,
    });
  }
}

/**
 * Get (or lazily create) the shared migration-role persistence handle for
 * `config`. Calling this repeatedly with the *same* configuration object
 * returns the same handle and reuses its pool; a different configuration
 * object — even with identical field values — gets its own handle.
 *
 * Never connects to PostgreSQL by itself.
 */
export function getMigrationPersistence(config: MigrationPersistenceConfig): Persistence {
  assertMigrationConfig(config);

  const existing = registry.get(config);
  if (existing) return existing;

  const handle = createPersistenceHandle({
    role: "migration",
    connectionString: config.databaseMigrationUrl,
    sslMode: config.databaseSslMode,
    applicationName: "boba-bear-persistence-migration",
    onClose: () => registry.delete(config),
  });
  registry.set(config, handle);
  return handle;
}
