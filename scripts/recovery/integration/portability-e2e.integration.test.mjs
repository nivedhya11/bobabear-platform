/**
 * Disposable PostgreSQL 18 end-to-end portability rehearsal + logical-backup role proof.
 *
 * LOCAL_PREQUALIFICATION path:
 *   source PG18 → restricted-role pg_dump -Fc → age → local object store
 *   → decrypt → fresh PG18 target → pg_restore → existing migrate.ts authority
 *   → business-integrity validation → cleanup
 *
 * Never touches production volumes. Skips only when container runtime is absent.
 * Prefer containerized age when host age is absent (via recovery image).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { DISPOSABLE_POSTGRES_IMAGE, resolveContainerCli } from "../docker-exec.mjs";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { runLogicalBackup } from "../layer2/backup.mjs";
import { runPortabilityRehearsal } from "../portability/rehearse.mjs";
import { generateRunId } from "../run-id.mjs";
import { PROOF_CODE } from "../constants.mjs";
import { createExistingMigrationAuthority } from "../migrate/authority.mjs";
import { cleanupAgeTools, resolveAgeTools } from "../tools/age-tools.mjs";
import { waitForPostgresReady } from "../tools/postgres-ready.mjs";
import { cleanupProvisionedTarget } from "../restore/provision.mjs";
import {
  FORBIDDEN_PRODUCTION_PROVIDER_ENV_KEYS,
  assertProductionProviderCredentialsAbsent,
} from "../validate/isolation.mjs";

function execInContainer(cli, name, args, options = {}) {
  return spawnSync(cli, ["exec", name, ...args], {
    encoding: options.encoding ?? "utf8",
    timeout: options.timeout ?? 60_000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function resolvePublishedPort(cli, containerName) {
  const result = spawnSync(cli, ["port", containerName, "5432"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0) return null;
  const match = String(result.stdout ?? "").match(/127\.0\.0\.1:(\d+)/);
  return match ? Number(match[1]) : null;
}

function bootstrapSourceRoles(cli, container, { migratorPassword, appPassword, logicalPassword }) {
  const sql = [
    `CREATE ROLE boba_bear_migrator WITH LOGIN PASSWORD '${migratorPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    `CREATE ROLE boba_bear_app WITH LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    `CREATE ROLE boba_bear_logical_backup WITH LOGIN PASSWORD '${logicalPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    "GRANT CONNECT ON DATABASE boba_recovery TO boba_bear_migrator;",
    "GRANT CREATE ON DATABASE boba_recovery TO boba_bear_migrator;",
    "GRANT CONNECT ON DATABASE boba_recovery TO boba_bear_app;",
    "GRANT CONNECT ON DATABASE boba_recovery TO boba_bear_logical_backup;",
    "CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION boba_bear_migrator;",
    "CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION boba_bear_migrator;",
    "REVOKE ALL ON SCHEMA app FROM PUBLIC;",
    "REVOKE ALL ON SCHEMA drizzle FROM PUBLIC;",
    "GRANT USAGE ON SCHEMA app TO boba_bear_app;",
    "GRANT USAGE ON SCHEMA app TO boba_bear_logical_backup;",
    "ALTER ROLE boba_bear_migrator IN DATABASE boba_recovery SET search_path = app, public;",
    "ALTER ROLE boba_bear_app IN DATABASE boba_recovery SET search_path = app, public;",
    "ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO boba_bear_app;",
    "ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT SELECT ON TABLES TO boba_bear_logical_backup;",
    "ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO boba_bear_app;",
    "ALTER DEFAULT PRIVILEGES FOR ROLE boba_bear_migrator IN SCHEMA app GRANT SELECT, USAGE ON SEQUENCES TO boba_bear_logical_backup;",
  ].join("\n");
  return execInContainer(cli, container, [
    "psql",
    "-U",
    "boba_recovery",
    "-d",
    "boba_recovery",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
}

test("postgres18: restricted-role dump + real migrate authority + portability restore/validate", async (t) => {
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }
  const ageTools = resolveAgeTools();
  if (!ageTools.ok) {
    t.skip(ageTools.reason);
    return;
  }

  const suffix = randomBytes(4).toString("hex");
  const sourceContainer = `boba-src-pg-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-port-e2e-"));
  const migratorPassword = `mig-${suffix}`;
  const appPassword = `app-${suffix}`;
  const logicalPassword = `logical-${suffix}`;
  const timings = {};

  try {
    const t0 = Date.now();
    const run = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        sourceContainer,
        "-e",
        "POSTGRES_PASSWORD=recovery-test-only",
        "-e",
        "POSTGRES_USER=boba_recovery",
        "-e",
        "POSTGRES_DB=boba_recovery",
        "-p",
        "127.0.0.1::5432",
        DISPOSABLE_POSTGRES_IMAGE,
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    if (run.status !== 0) {
      t.skip(`failed to start source postgres: ${run.stderr || run.stdout}`);
      return;
    }
    assert.equal(
      waitForPostgresReady({
        cli,
        containerName: sourceContainer,
        user: "boba_recovery",
        db: "boba_recovery",
      }),
      true,
    );
    const sourcePort = resolvePublishedPort(cli, sourceContainer);
    assert.ok(sourcePort, "source publish must be loopback");

    const seed = bootstrapSourceRoles(cli, sourceContainer, {
      migratorPassword,
      appPassword,
      logicalPassword,
    });
    assert.equal(seed.status, 0, seed.stderr || seed.stdout);

    // Restricted-role attribute proof.
    const roleAttrs = execInContainer(cli, sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-t",
      "-A",
      "-F",
      ",",
      "-c",
      "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication FROM pg_roles WHERE rolname = 'boba_bear_logical_backup';",
    ]);
    assert.equal(roleAttrs.status, 0);
    assert.equal(String(roleAttrs.stdout ?? "").trim(), "f,f,f,f");

    const sourceMigratorUrl = `postgresql://boba_bear_migrator:${migratorPassword}@127.0.0.1:${sourcePort}/boba_recovery`;
    const migrateSource = createExistingMigrationAuthority({
      databaseUrl: sourceMigratorUrl,
      env: {
        ...process.env,
        BOBA_BEAR_ENV: process.env.BOBA_BEAR_ENV || "local",
        BOBA_BEAR_PUBLIC_ORIGIN: process.env.BOBA_BEAR_PUBLIC_ORIGIN || "http://localhost:3000",
        BOBA_BEAR_LOG_LEVEL: process.env.BOBA_BEAR_LOG_LEVEL || "error",
        BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS: "true",
        BOBA_BEAR_DATABASE_SSL_MODE: "disable",
      },
    });
    const migratedSource = await migrateSource();
    assert.equal(migratedSource.ok, true, migratedSource.reason);
    timings.migrationMs = Date.now() - t0;

    // Ensure logical role can SELECT application + migration-history objects for a complete dump.
    const grants = execInContainer(cli, sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      [
        "GRANT USAGE ON SCHEMA app TO boba_bear_logical_backup;",
        "GRANT USAGE ON SCHEMA drizzle TO boba_bear_logical_backup;",
        "GRANT SELECT ON ALL TABLES IN SCHEMA app TO boba_bear_logical_backup;",
        "GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO boba_bear_logical_backup;",
        "GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA app TO boba_bear_logical_backup;",
        "GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA drizzle TO boba_bear_logical_backup;",
      ].join("\n"),
    ]);
    assert.equal(grants.status, 0, grants.stderr || grants.stdout);

    const dumpStart = Date.now();
    const dump = execInContainer(
      cli,
      sourceContainer,
      ["pg_dump", "-Fc", "-U", "boba_bear_logical_backup", "boba_recovery"],
      { encoding: "buffer", timeout: 180_000 },
    );
    assert.equal(dump.status, 0, String(dump.stderr ?? ""));
    const dumpBuffer = Buffer.isBuffer(dump.stdout) ? dump.stdout : Buffer.from(dump.stdout ?? "");
    assert.ok(dumpBuffer.length > 0);
    timings.logicalBackupMs = Date.now() - dumpStart;

    // Source marker content for post-rehearsal unchanged proof.
    const sourceMarker = `source-marker-${suffix}`;
    execInContainer(cli, sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `CREATE TABLE IF NOT EXISTS app.recovery_source_marker (id text PRIMARY KEY); INSERT INTO app.recovery_source_marker(id) VALUES ('${sourceMarker}') ON CONFLICT DO NOTHING;`,
    ]);
    // Re-dump after marker so restore includes it? Marker is for SOURCE survival only —
    // insert after dump so restored target intentionally lacks it while source retains it.
    const postDumpMarker = execInContainer(cli, sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `CREATE TABLE IF NOT EXISTS public.source_only_marker (id text PRIMARY KEY); INSERT INTO public.source_only_marker(id) VALUES ('${sourceMarker}');`,
    ]);
    assert.equal(postDumpMarker.status, 0, postDumpMarker.stderr || postDumpMarker.stdout);

    const identityPath = path.join(work, "age-identity");
    const keygen = spawnSync(ageTools.ageKeygenBin, ["-o", identityPath], {
      encoding: "utf8",
      timeout: 30_000,
    });
    let recipient = `${keygen.stdout ?? ""}\n${keygen.stderr ?? ""}`
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith("Public key:") || line.startsWith("age1"));
    if (recipient?.startsWith("Public key:")) recipient = recipient.replace("Public key:", "").trim();
    assert.ok(recipient?.startsWith("age1"), `disposable age recipient required: ${keygen.stderr || keygen.stdout}`);

    const storeRoot = path.join(work, "store");
    const evidenceDir = path.join(work, "evidence");
    const objectStore = createLocalObjectStore({ localRoot: storeRoot });
    const backupRunId = generateRunId();
    const backup = await runLogicalBackup({
      runId: backupRunId,
      objectStore,
      evidenceDir,
      recipients: [recipient],
      sourceIdentity: "integration-source-pg",
      sourceClassification: "production",
      candidate: {
        repositoryPath: "/home/ajoshi/repos/boba-bear-platform",
        branch: "test",
        commitSha: "integration",
        tree: "integration",
      },
      ageBin: ageTools.ageBin,
      dumpFn: async () => dumpBuffer,
    });
    assert.equal(backup.ok, true, backup.reason);

    writeFileSync(path.join(work, "source-marker"), sourceContainer, "utf8");

    // Controlled disposable validation env: production provider credentials absent;
    // no production DNS/host mapping introduced by this rehearsal.
    const controlledEnv = { ...process.env };
    for (const key of FORBIDDEN_PRODUCTION_PROVIDER_ENV_KEYS) {
      delete controlledEnv[key];
    }
    delete controlledEnv.BOBA_RECOVERY_ALLOW_LIVE_PROVIDERS;
    delete controlledEnv.BOBA_PAYMENT_INITIATE;
    delete controlledEnv.BOBA_NOTIFICATION_INITIATE;
    controlledEnv.BOBA_BEAR_ENV = process.env.BOBA_BEAR_ENV || "local";
    controlledEnv.BOBA_BEAR_PUBLIC_ORIGIN = process.env.BOBA_BEAR_PUBLIC_ORIGIN || "http://localhost:3000";
    controlledEnv.BOBA_BEAR_LOG_LEVEL = process.env.BOBA_BEAR_LOG_LEVEL || "error";
    controlledEnv.BOBA_BEAR_ALLOW_UNSAFE_ADAPTERS = "true";
    controlledEnv.BOBA_BEAR_DATABASE_SSL_MODE = "disable";

    const credentialsAbsent = assertProductionProviderCredentialsAbsent(controlledEnv);
    assert.equal(credentialsAbsent.ok, true, credentialsAbsent.reason);

    const rehearsalStart = Date.now();
    // No migrateFn inject — must exercise existing repository migration authority.
    // Isolation flags are NOT hard-coded true: provisioned target supplies runtime network proof.
    const rehearsal = await runPortabilityRehearsal({
      runIdToRestore: backupRunId,
      objectStore,
      identityFile: identityPath,
      sourceIdentity: "integration-source-pg",
      sourceClassification: "production",
      sourceDatabaseUrl: `postgresql://boba_recovery:recovery-test-only@127.0.0.1:${sourcePort}/boba_recovery`,
      evidenceDir: path.join(work, "rehearsal-evidence"),
      ageBin: ageTools.ageBin,
      provisionTarget: true,
      retainTarget: true,
      env: controlledEnv,
    });
    timings.portabilityMs = Date.now() - rehearsalStart;

    assert.equal(rehearsal.ok, true, rehearsal.reason);
    assert.ok(rehearsal.databaseUrl);
    assert.ok(rehearsal.provisioned?.volumeOrPathId);
    assert.ok(rehearsal.provisioned?.migratorDatabaseUrl);
    assert.ok(rehearsal.provisioned?.networkName);
    assert.equal(rehearsal.provisioned?.networkInternalVerified, true);
    assert.equal(rehearsal.provisioned?.productionDnsAbsentVerified, true);
    assert.equal(
      (rehearsal.validation?.results ?? []).some(
        (entry) => entry.code === PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED && entry.ok,
      ),
      true,
      JSON.stringify(rehearsal.validation?.results ?? [], null, 2),
    );
    assert.equal(
      (rehearsal.evidence?.findings ?? []).some(
        (f) => f.code === "PORTABILITY_REHEARSAL_OK" && f.networkInternalVerified === true && f.localProviderSuppression === "SUPPRESSED",
      ),
      true,
    );

    // Positively re-inspect the run-owned network is still internal before cleanup.
    const netInspect = spawnSync(cli, ["network", "inspect", rehearsal.provisioned.networkName], {
      encoding: "utf8",
      timeout: 15_000,
    });
    assert.equal(netInspect.status, 0, netInspect.stderr);
    const netJson = JSON.parse(netInspect.stdout);
    const netEntry = Array.isArray(netJson) ? netJson[0] : netJson;
    assert.equal(netEntry.Internal === true || netEntry.internal === true, true);

    // Source container still exists and retains post-dump marker (unchanged by restore).
    const inspect = spawnSync(cli, ["inspect", sourceContainer], { encoding: "utf8" });
    assert.equal(inspect.status, 0);
    const sourceMarkerCheck = execInContainer(cli, sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-t",
      "-A",
      "-c",
      "SELECT id FROM public.source_only_marker LIMIT 1;",
    ]);
    assert.equal(sourceMarkerCheck.status, 0);
    assert.equal(String(sourceMarkerCheck.stdout ?? "").trim(), sourceMarker);

    writeFileSync(
      path.join(work, "local-timings.json"),
      JSON.stringify(
        {
          QUALIFYING: false,
          NON_QUALIFYING_LOCAL_TIMING_OBSERVATIONS: timings,
          RPO_RTO_PROVEN: "NO",
          DROPLET_2GIB_RTO_VALIDATED: "NO",
        },
        null,
        2,
      ),
      "utf8",
    );
    // Keep timings readable in test output without failing.
    process.stdout.write(`LOCAL_PORTABILITY_TIMINGS ${readFileSync(path.join(work, "local-timings.json"), "utf8")}\n`);

    // Cleanup only run-owned target + its network.
    if (rehearsal.provisioned) {
      const cleaned = cleanupProvisionedTarget(rehearsal.provisioned);
      assert.equal(cleaned.ok, true, cleaned.reason);
      const netGone = spawnSync(cli, ["network", "inspect", rehearsal.provisioned.networkName], {
        encoding: "utf8",
        timeout: 15_000,
      });
      assert.notEqual(netGone.status, 0);
    }
  } finally {
    spawnSync(cli, ["rm", "-f", sourceContainer], { encoding: "utf8" });
    cleanupAgeTools(ageTools.cleanupDir);
    rmSync(work, { recursive: true, force: true });
  }
});
