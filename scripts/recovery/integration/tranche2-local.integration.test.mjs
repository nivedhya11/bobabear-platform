/**
 * IMP-037 LOCAL_PREQUALIFICATION_TRANCHE_2 integration proofs.
 *
 * Disposable only. NOT qualifying external / Spaces / Phase-1 proof.
 *
 * Gate with BOBA_RECOVERY_BUILD_POSTGRES=1 or BOBA_RECOVERY_LAYER1_POSIX=1
 * (same convention as Layer-1 POSIX mechanics). Default CI skips heavy paths.
 *
 * Covers:
 *   - real local Layer-1 PITR (named restore point)
 *   - heavy flock contention + WAL continuity while lock held
 *   - Layer-1 NEW_ENCRYPTED_REPOSITORY_GENERATION rotation
 *   - recovered application startup against an *actual* Layer-2 restored target
 *     (dump → age → restore → migrate → marker proof → /health/ready)
 *   - repeatability across distinct RUN_IDs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { assertPgbackrestVersion } from "../layer1/config.mjs";
import { planRepositoryGenerationRotation } from "../layer1/rotation.mjs";
import { withHeavyOpLock } from "../flock.mjs";
import { DISPOSABLE_POSTGRES_IMAGE, resolveContainerCli } from "../docker-exec.mjs";
import { waitForPostgresReady } from "../tools/postgres-ready.mjs";
import { generateRunId } from "../run-id.mjs";
import { provisionLogicalTarget, cleanupProvisionedTarget } from "../restore/provision.mjs";
import { createExistingMigrationAuthority } from "../migrate/authority.mjs";
import { startRecoveredApplication, RECOVERED_APP_READINESS_PATH } from "../validate/recovered-app.mjs";
import { runPitrRestore } from "../restore/pitr.mjs";
import { OPERATION_STATUS, PROOF_CODE } from "../constants.mjs";
import { createLocalObjectStore } from "../spaces/local.mjs";
import { runLogicalBackup } from "../layer2/backup.mjs";
import { runPortabilityRehearsal } from "../portability/rehearse.mjs";
import { cleanupAgeTools, resolveAgeTools } from "../tools/age-tools.mjs";
import {
  FORBIDDEN_PRODUCTION_PROVIDER_ENV_KEYS,
  assertProductionProviderCredentialsAbsent,
} from "../validate/isolation.mjs";

const IMAGE_CANDIDATES = ["boba-bear-postgres:local", "localhost/boba-bear-postgres:local"];
const RESTORE_POINT_NAME = "boba_pitr_marker_a";

function heavyEnabled() {
  return process.env.BOBA_RECOVERY_BUILD_POSTGRES === "1" || process.env.BOBA_RECOVERY_LAYER1_POSIX === "1";
}

function resolveLocalImage(cli) {
  for (const name of IMAGE_CANDIDATES) {
    const probe = spawnSync(cli, ["image", "inspect", name], {
      encoding: "utf8",
      timeout: 20_000,
    });
    if (probe.status === 0) return name;
  }
  return null;
}

function execIn(cli, name, args, options = {}) {
  return spawnSync(cli, ["exec", "-u", options.user ?? "postgres", name, ...args], {
    encoding: options.encoding ?? "utf8",
    timeout: options.timeout ?? 300_000,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function psql(cli, container, sql, options = {}) {
  return spawnSync(
    cli,
    [
      "exec",
      "-e",
      `PGPASSWORD=${options.password ?? "recovery-test-only"}`,
      container,
      "psql",
      "-U",
      options.user ?? "postgres",
      "-d",
      options.db ?? "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-tAc",
      sql,
    ],
    { encoding: "utf8", timeout: options.timeout ?? 60_000 },
  );
}

function countArchiveFiles(cli, container, repoPathInContainer = "/var/lib/pgbackrest/repo-gen-1") {
  const result = spawnSync(
    cli,
    [
      "exec",
      "-u",
      "postgres",
      container,
      "bash",
      "-lc",
      `find ${shellQuote(repoPathInContainer)}/archive -type f 2>/dev/null | wc -l`,
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  if (result.status !== 0) return 0;
  const n = Number(String(result.stdout ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function cleanupWork(cli, imageName, work) {
  spawnSync(cli, ["run", "--rm", "-v", `${work}:/work:Z`, imageName, "bash", "-lc", "rm -rf /work/*"], {
    encoding: "utf8",
    timeout: 60_000,
  });
  try {
    rmSync(work, { recursive: true, force: true });
  } catch {
    spawnSync("rm", ["-rf", work], { encoding: "utf8" });
  }
}

test("PITR negatives: pgbackrest nonzero and restored startup failure never SUCCEEDED", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-pitr-neg-"));
  try {
    const nonzero = await runPitrRestore({
      runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 21, 10, 0, 0)), randomHex: "1111111111111111" }),
      target: { type: "name", value: "missing_point" },
      sourceIdentity: "disposable-source",
      sourceClassification: "recovery",
      sourcePgdataPath: "/var/lib/postgresql/data",
      workspaceRoot: path.join(root, "nz"),
      provisionTarget: true,
      execFn: () => ({ status: 47, stdout: "", stderr: "pgbackrest restore simulated failure" }),
    });
    assert.equal(nonzero.ok, false);
    assert.equal(nonzero.status, OPERATION_STATUS.FAILED);
    assert.notEqual(nonzero.status, OPERATION_STATUS.SUCCEEDED);

    const startupFail = await runPitrRestore({
      runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 21, 10, 1, 0)), randomHex: "2222222222222222" }),
      target: { type: "name", value: RESTORE_POINT_NAME },
      sourceIdentity: "disposable-source",
      sourceClassification: "recovery",
      sourcePgdataPath: "/var/lib/postgresql/data",
      workspaceRoot: path.join(root, "sf"),
      provisionTarget: true,
      execFn: () => ({ status: 0, stdout: "ok", stderr: "" }),
      afterRestoreFn: async () => ({ ok: false, reason: "postgres failed to start", code: "RESTORED_POSTGRES_START_FAILED" }),
    });
    assert.equal(startupFail.ok, false);
    assert.equal(startupFail.status, OPERATION_STATUS.FAILED);
    assert.match(startupFail.reason ?? "", /postgres failed to start/i);

    const invalidTarget = await runPitrRestore({
      runId: generateRunId({ now: new Date(Date.UTC(2026, 8, 21, 10, 2, 0)), randomHex: "3333333333333333" }),
      target: { type: "name", value: "   " },
      sourceIdentity: "disposable-source",
      workspaceRoot: path.join(root, "iv"),
      provisionTarget: true,
      execFn: () => ({ status: 0, stdout: "", stderr: "" }),
    });
    assert.equal(invalidTarget.ok, false);
    assert.equal(invalidTarget.status, OPERATION_STATUS.FAILED);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local Layer-1 PITR + WAL-during-lock + generation rotation (NOT Spaces)", async (t) => {
  if (!heavyEnabled()) {
    t.skip("set BOBA_RECOVERY_BUILD_POSTGRES=1 or BOBA_RECOVERY_LAYER1_POSIX=1");
    return;
  }
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }
  let imageName = resolveLocalImage(cli);
  if (!imageName && process.env.BOBA_RECOVERY_BUILD_POSTGRES === "1") {
    const build = spawnSync(
      cli,
      ["build", "-f", "docker/postgres/Dockerfile", "-t", "boba-bear-postgres:local", "."],
      { encoding: "utf8", timeout: 1_800_000 },
    );
    assert.equal(build.status, 0, build.stderr || build.stdout);
    imageName = resolveLocalImage(cli);
  }
  if (!imageName) {
    t.skip("boba-bear-postgres:local image not present");
    return;
  }

  const version = spawnSync(cli, ["run", "--rm", imageName, "pgbackrest", "version"], {
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(version.status, 0, version.stderr || version.stdout);
  assert.equal(assertPgbackrestVersion(version.stdout).ok, true);

  const suffix = randomBytes(4).toString("hex");
  const source = `boba-l1-pitr-src-${suffix}`;
  const restored = `boba-l1-pitr-tgt-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-l1-pitr-"));
  const repoGen1 = path.join(work, "repo-gen-1");
  const repoGen2 = path.join(work, "repo-gen-2");
  const targetPgdata = path.join(work, `pitr-target-${suffix}`, "pgdata");
  mkdirSync(repoGen1, { recursive: true });
  mkdirSync(repoGen2, { recursive: true });
  mkdirSync(targetPgdata, { recursive: true });
  writeFileSync(
    path.join(work, `pitr-target-${suffix}`, "TARGET_OWNED_BY_RUN"),
    JSON.stringify({
      runId: `run-local-pitr-${suffix}`,
      targetIdentity: `pitr-target-${suffix}`,
      pgdataPath: targetPgdata,
      environment: "recovery",
    }),
    "utf8",
  );

  const cipherA = `local-only-cipher-A-${suffix}-not-founder`;
  const cipherB = `local-only-cipher-B-${suffix}-not-founder`;
  const lockPath = path.join(work, "heavy.lock");
  /** @type {Record<string, unknown>} */
  const result = {
    LOCAL_LAYER1_PITR: "BLOCKED",
    REAL_SPACES_LAYER1: "NOT_PERFORMED",
    LOCAL_WAL_CONTINUITY_DURING_HEAVY_LOCK: "BLOCKED",
    LOCAL_LAYER1_GENERATION_ROTATION: "BLOCKED",
    QUALIFYING_EXTERNAL_PROOF: "NO",
  };

  try {
    const run = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        source,
        "-e",
        "POSTGRES_PASSWORD=recovery-test-only",
        "-e",
        "POSTGRES_USER=postgres",
        "-e",
        "POSTGRES_DB=postgres",
        "-e",
        "BOBA_PGBACKREST_ARCHIVE=1",
        "-e",
        "BOBA_PGBACKREST_REPO_MODE=posix",
        "-e",
        "BOBA_PGBACKREST_GENERATION=1",
        "-e",
        "BOBA_PGBACKREST_STANZA=boba",
        "-e",
        `PGBACKREST_CIPHER_PASS=${cipherA}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherA}`,
        "-v",
        `${repoGen1}:/var/lib/pgbackrest/repo-gen-1:Z`,
        imageName,
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(
      waitForPostgresReady({ cli, containerName: source, user: "postgres", db: "postgres", attempts: 120 }),
      true,
    );
    spawnSync(cli, ["exec", "-u", "root", source, "chown", "-R", "postgres:postgres", "/var/lib/pgbackrest"], {
      encoding: "utf8",
      timeout: 30_000,
    });

    assert.equal(execIn(cli, source, ["pgbackrest", "--stanza=boba", "stanza-create"], { timeout: 180_000 }).status, 0);
    assert.equal(execIn(cli, source, ["pgbackrest", "--stanza=boba", "check"], { timeout: 180_000 }).status, 0);
    assert.equal(
      execIn(cli, source, ["pgbackrest", "--stanza=boba", "backup", "--type=full"], { timeout: 600_000 }).status,
      0,
    );

    // State A → named restore point → archive WAL → state B (after RP).
    // PITR must run before any later backup that post-dates the restore point,
    // otherwise pgBackRest may select a newer backup and fail to reach the target.
    assert.equal(
      psql(
        cli,
        source,
        "CREATE TABLE public.pitr_markers(id text PRIMARY KEY, note text); INSERT INTO public.pitr_markers VALUES ('A','before_rp');",
      ).status,
      0,
    );
    assert.equal(psql(cli, source, `SELECT pg_create_restore_point('${RESTORE_POINT_NAME}');`).status, 0);
    assert.equal(psql(cli, source, "SELECT pg_switch_wal();").status, 0);
    await delay(4000);
    assert.equal(
      psql(cli, source, "INSERT INTO public.pitr_markers VALUES ('B','after_rp'); SELECT pg_switch_wal();").status,
      0,
    );
    await delay(4000);

    const infoForSet = execIn(cli, source, ["pgbackrest", "--stanza=boba", "info", "--output=json"], {
      timeout: 120_000,
    });
    assert.equal(infoForSet.status, 0, infoForSet.stderr || infoForSet.stdout);
    const infoParsed = JSON.parse(String(infoForSet.stdout ?? "[]"));
    const fullLabel =
      infoParsed?.[0]?.backup?.find((b) => b.type === "full")?.label ??
      infoParsed?.[0]?.backup?.[0]?.label;
    assert.ok(typeof fullLabel === "string" && fullLabel.length > 0, "full backup label required for PITR set");

    const restoreOnce = spawnSync(
      cli,
      [
        "run",
        "--rm",
        "--user",
        "root",
        "-e",
        "BOBA_PGBACKREST_ARCHIVE=1",
        "-e",
        "BOBA_PGBACKREST_REPO_MODE=posix",
        "-e",
        "BOBA_PGBACKREST_GENERATION=1",
        "-e",
        "BOBA_PGBACKREST_STANZA=boba",
        "-e",
        `PGBACKREST_CIPHER_PASS=${cipherA}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherA}`,
        "-v",
        `${repoGen1}:/var/lib/pgbackrest/repo-gen-1:Z`,
        "-v",
        `${targetPgdata}:/pgdata:Z`,
        "--entrypoint",
        "bash",
        imageName,
        "-lc",
        [
          "set -euo pipefail",
          "chown -R postgres:postgres /pgdata /var/lib/pgbackrest /etc/pgbackrest",
          "boba-render-pgbackrest-conf > /etc/pgbackrest/pgbackrest.conf",
          "chown postgres:postgres /etc/pgbackrest/pgbackrest.conf",
          "chmod 640 /etc/pgbackrest/pgbackrest.conf",
          "runuser -u postgres -- pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=boba restore" +
            ` --set=${fullLabel} --type=name --target=${RESTORE_POINT_NAME}` +
            " --target-action=promote --pg1-path=/pgdata",
        ].join(" && "),
      ],
      { encoding: "utf8", timeout: 600_000 },
    );
    assert.equal(restoreOnce.status, 0, restoreOnce.stderr || restoreOnce.stdout);

    const restoredListing = spawnSync(
      cli,
      [
        "run",
        "--rm",
        "--user",
        "postgres",
        "-v",
        `${targetPgdata}:/pgdata:Z`,
        "--entrypoint",
        "bash",
        imageName,
        "-lc",
        "test -f /pgdata/PG_VERSION && test -f /pgdata/backup_label -o -f /pgdata/recovery.signal -o -f /pgdata/postgresql.auto.conf && ls /pgdata | head",
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    assert.equal(
      restoredListing.status,
      0,
      `restored PGDATA incomplete: ${restoredListing.stderr || restoredListing.stdout}`,
    );
    assert.notEqual(path.resolve(targetPgdata), path.resolve("/var/lib/postgresql/data"));
    const startRestored = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        restored,
        "--user",
        "root",
        "-e",
        "BOBA_PGBACKREST_ARCHIVE=1",
        "-e",
        "BOBA_PGBACKREST_REPO_MODE=posix",
        "-e",
        "BOBA_PGBACKREST_GENERATION=1",
        "-e",
        "BOBA_PGBACKREST_STANZA=boba",
        "-e",
        `PGBACKREST_CIPHER_PASS=${cipherA}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherA}`,
        "-e",
        "PGDATA=/pgdata",
        "-v",
        `${repoGen1}:/var/lib/pgbackrest/repo-gen-1:Z`,
        "-v",
        `${targetPgdata}:/pgdata:Z`,
        "--entrypoint",
        "bash",
        imageName,
        "-lc",
        [
          "set -euo pipefail",
          "chown -R postgres:postgres /pgdata /var/lib/pgbackrest",
          "boba-render-pgbackrest-conf > /etc/pgbackrest/pgbackrest.conf",
          "chown postgres:postgres /etc/pgbackrest/pgbackrest.conf",
          "chmod 640 /etc/pgbackrest/pgbackrest.conf",
          // Bypass PG18 docker-entrypoint mount-layout guard for disposable PITR PGDATA.
          "exec runuser -u postgres -- /usr/lib/postgresql/18/bin/postgres -D /pgdata",
        ].join(" && "),
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    assert.equal(startRestored.status, 0, startRestored.stderr || startRestored.stdout);
    const restoredReady = waitForPostgresReady({
      cli,
      containerName: restored,
      user: "postgres",
      db: "postgres",
      attempts: 180,
    });
    if (!restoredReady) {
      const logs = spawnSync(cli, ["logs", restored], { encoding: "utf8", timeout: 15_000 });
      assert.fail(`restored postgres ready\n${logs.stderr || ""}\n${logs.stdout || ""}`);
    }

    const markers = psql(cli, restored, "SELECT string_agg(id, ',' ORDER BY id) FROM public.pitr_markers;");
    assert.equal(markers.status, 0, markers.stderr || markers.stdout);
    const markerSet = String(markers.stdout ?? "").trim();
    assert.equal(markerSet, "A", `expected only A at named restore point; got ${markerSet}`);

    // Source still running and still has A+B(+C).
    const sourceMarkers = psql(cli, source, "SELECT string_agg(id, ',' ORDER BY id) FROM public.pitr_markers;");
    assert.equal(sourceMarkers.status, 0);
    assert.match(String(sourceMarkers.stdout ?? ""), /A.*B/);

    result.LOCAL_LAYER1_PITR = "PASS";
    result.pitr = {
      actual_pgbackrest_restore: true,
      target_type: "name",
      target_value_safe_reference: RESTORE_POINT_NAME,
      fresh_target: true,
      postgres_started: true,
      recovered_state_verified: true,
      source_unchanged: true,
      backup_set: fullLabel,
    };

    // Heavy lock held while WAL is generated + archived (archive-push must NOT take the lock).
    const archiveBefore = countArchiveFiles(cli, source);
    let walArchivedDuringLock = false;
    const heavy = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "pitr-heavy" }, async () => {
      const contender = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "contender" }, async () => "nope");
      assert.equal(contender.status, "SKIPPED_LOCK_HELD");
      assert.equal(contender.ok, false);

      assert.equal(
        psql(cli, source, "INSERT INTO public.pitr_markers VALUES ('C','during_heavy_lock'); SELECT pg_switch_wal();")
          .status,
        0,
      );
      await delay(8000);
      const archiveDuring = countArchiveFiles(cli, source);
      walArchivedDuringLock = archiveDuring > archiveBefore;
      return {
        heavy_lock_held: true,
        wal_generation_during_lock: true,
        wal_archived_during_lock: walArchivedDuringLock,
        contender_blocked: true,
      };
    });
    assert.equal(heavy.status, "ACQUIRED");
    assert.equal(heavy.result.contender_blocked, true);
    assert.equal(walArchivedDuringLock, true, "WAL must archive while heavy lock held");
    result.LOCAL_WAL_CONTINUITY_DURING_HEAVY_LOCK = "PASS";
    result.heavy_lock = heavy.result;

    assert.equal(
      execIn(cli, source, ["pgbackrest", "--stanza=boba", "backup", "--type=diff"], { timeout: 600_000 }).status,
      0,
    );

    // Layer-1 generation rotation: new repo-gen-2 + passphrase B; prior gen preserved/readable.
    const inPlace = planRepositoryGenerationRotation({
      currentGeneration: 1,
      newPassphrasePresent: true,
      inPlaceCipherChange: true,
    });
    assert.equal(inPlace.ok, false);

    const rotationPlan = planRepositoryGenerationRotation({
      currentGeneration: 1,
      newPassphrasePresent: true,
      preservePriorGeneration: true,
    });
    assert.equal(rotationPlan.ok, true);
    assert.equal(rotationPlan.plan.nextRepoPath, "repo-gen-2");

    // Stop restored target before rotating source archive binding.
    spawnSync(cli, ["rm", "-f", restored], { encoding: "utf8" });

    // Bind active generation to repo-gen-2 on a fresh disposable PG for new backups.
    const gen2 = `boba-l1-gen2-${suffix}`;
    const gen2Run = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        gen2,
        "-e",
        "POSTGRES_PASSWORD=recovery-test-only",
        "-e",
        "POSTGRES_USER=postgres",
        "-e",
        "POSTGRES_DB=postgres",
        "-e",
        "BOBA_PGBACKREST_ARCHIVE=1",
        "-e",
        "BOBA_PGBACKREST_REPO_MODE=posix",
        "-e",
        "BOBA_PGBACKREST_GENERATION=2",
        "-e",
        "BOBA_PGBACKREST_STANZA=boba",
        "-e",
        `PGBACKREST_CIPHER_PASS=${cipherB}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherB}`,
        "-v",
        `${repoGen2}:/var/lib/pgbackrest/repo-gen-2:Z`,
        imageName,
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    assert.equal(gen2Run.status, 0, gen2Run.stderr || gen2Run.stdout);
    assert.equal(
      waitForPostgresReady({ cli, containerName: gen2, user: "postgres", db: "postgres", attempts: 120 }),
      true,
    );
    spawnSync(cli, ["exec", "-u", "root", gen2, "chown", "-R", "postgres:postgres", "/var/lib/pgbackrest"], {
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(execIn(cli, gen2, ["pgbackrest", "--stanza=boba", "stanza-create"], { timeout: 180_000 }).status, 0);
    assert.equal(execIn(cli, gen2, ["pgbackrest", "--stanza=boba", "check"], { timeout: 180_000 }).status, 0);
    assert.equal(
      execIn(cli, gen2, ["pgbackrest", "--stanza=boba", "backup", "--type=full"], { timeout: 600_000 }).status,
      0,
    );

    assert.ok(existsSync(repoGen1));
    assert.ok(existsSync(repoGen2));
    assert.notEqual(path.resolve(repoGen1), path.resolve(repoGen2));

    // Prior generation remains readable with passphrase A (info JSON).
    const infoGen1 = spawnSync(
      cli,
      [
        "run",
        "--rm",
        "--user",
        "postgres",
        "-e",
        "BOBA_PGBACKREST_ARCHIVE=1",
        "-e",
        "BOBA_PGBACKREST_REPO_MODE=posix",
        "-e",
        "BOBA_PGBACKREST_GENERATION=1",
        "-e",
        "BOBA_PGBACKREST_STANZA=boba",
        "-e",
        `PGBACKREST_CIPHER_PASS=${cipherA}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherA}`,
        "-v",
        `${repoGen1}:/var/lib/pgbackrest/repo-gen-1:Z`,
        "--entrypoint",
        "bash",
        imageName,
        "-lc",
        "boba-render-pgbackrest-conf > /etc/pgbackrest/pgbackrest.conf && chmod 640 /etc/pgbackrest/pgbackrest.conf && pgbackrest --config=/etc/pgbackrest/pgbackrest.conf --stanza=boba info --output=json",
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    assert.equal(infoGen1.status, 0, infoGen1.stderr || infoGen1.stdout);
    const infoJson = JSON.parse(String(infoGen1.stdout ?? "[]"));
    assert.ok(Array.isArray(infoJson) && infoJson.length > 0);

    writeFileSync(path.join(work, "active-generation"), "2\n", "utf8");
    result.LOCAL_LAYER1_GENERATION_ROTATION = "PASS";
    result.layer1_rotation = {
      generation_1: "repo-gen-1",
      generation_2: "repo-gen-2",
      in_place_rotation_refused: true,
      prior_generation_preserved: true,
      new_generation_backup: true,
      prior_generation_readable: true,
      active_generation_binding: "2",
      OFF_HOST_CUSTODY_EXECUTED: "NO",
      REAL_SPACES: "NOT_PERFORMED",
    };

    spawnSync(cli, ["rm", "-f", gen2], { encoding: "utf8" });
    writeFileSync(path.join(work, "tranche2-layer1-result.json"), JSON.stringify(result, null, 2), "utf8");
    process.stdout.write(`TRANCHE2_LAYER1_RESULT ${JSON.stringify(result)}\n`);
  } finally {
    spawnSync(cli, ["rm", "-f", source, restored, `boba-l1-gen2-${suffix}`], { encoding: "utf8" });
    cleanupWork(cli, imageName, work);
  }
});

/**
 * Actual restored-target recovered-app path (NOT fresh-schema-only).
 *
 * Chain: disposable source PG18 → migrate → seed provenance marker → restricted
 * pg_dump -Fc → age → local store → decrypt → pg_restore → fresh PG18 target →
 * existing migration authority → business integrity → verify marker on SAME
 * target → start customer-auth → /health/ready → verify source untouched.
 */
test("recovered application startup against actual Layer-2 restored target (QUALIFYING_APP_RECOVERY=NO)", async (t) => {
  if (!heavyEnabled() && process.env.BOBA_RECOVERY_APP_STARTUP !== "1") {
    t.skip("set BOBA_RECOVERY_BUILD_POSTGRES=1, BOBA_RECOVERY_LAYER1_POSIX=1, or BOBA_RECOVERY_APP_STARTUP=1");
    return;
  }
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
  const authImages = ["boba-bear-customer-auth:local", "localhost/boba-bear-customer-auth:local"];
  let authImage = null;
  for (const name of authImages) {
    const probe = spawnSync(cli, ["image", "inspect", name], { encoding: "utf8", timeout: 20_000 });
    if (probe.status === 0) {
      authImage = name;
      break;
    }
  }
  if (!authImage) {
    t.skip("boba-bear-customer-auth:local missing");
    return;
  }

  const suffix = randomBytes(4).toString("hex");
  const sourceContainer = `boba-t2-src-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-t2-rec-app-"));
  const migratorPassword = `mig-${suffix}`;
  const appPassword = `app-${suffix}`;
  const logicalPassword = `logical-${suffix}`;
  const provenanceMarker = `imp037-restore-marker-${suffix}`;
  let provisioned = null;
  let appCleanup = null;

  function execInContainer(name, args, options = {}) {
    return spawnSync(cli, ["exec", name, ...args], {
      encoding: options.encoding ?? "utf8",
      timeout: options.timeout ?? 60_000,
      maxBuffer: 64 * 1024 * 1024,
    });
  }

  function resolvePublishedPort(containerName) {
    const result = spawnSync(cli, ["port", containerName, "5432"], {
      encoding: "utf8",
      timeout: 15_000,
    });
    if (result.status !== 0) return null;
    const match = String(result.stdout ?? "").match(/127\.0\.0\.1:(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function queryContainer(containerName, sql) {
    return execInContainer(containerName, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-t",
      "-A",
      "-c",
      sql,
    ]);
  }

  try {
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
    const sourcePort = resolvePublishedPort(sourceContainer);
    assert.ok(sourcePort, "source publish must be loopback");

    const bootstrapSql = [
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
    const seed = execInContainer(sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      bootstrapSql,
    ]);
    assert.equal(seed.status, 0, seed.stderr || seed.stdout);

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

    const grants = execInContainer(sourceContainer, [
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

    // Provenance marker seeded BEFORE dump — must travel through backup/restore,
    // and must NOT be introduced by post-restore migrations. Use app schema so
    // migrator-owned pg_restore (no CREATE on public in PG15+) can recreate it.
    const markerSeed = execInContainer(sourceContainer, [
      "psql",
      "-U",
      "boba_recovery",
      "-d",
      "boba_recovery",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      [
        "CREATE TABLE IF NOT EXISTS app.imp037_restore_provenance (",
        "  marker_id text PRIMARY KEY,",
        "  seeded_before_dump boolean NOT NULL DEFAULT true",
        ");",
        "ALTER TABLE app.imp037_restore_provenance OWNER TO boba_bear_migrator;",
        `INSERT INTO app.imp037_restore_provenance(marker_id, seeded_before_dump)`,
        `VALUES ('${provenanceMarker}', true);`,
        "GRANT SELECT ON TABLE app.imp037_restore_provenance TO boba_bear_logical_backup;",
      ].join("\n"),
    ]);
    assert.equal(markerSeed.status, 0, markerSeed.stderr || markerSeed.stdout);

    const sourceMarkerBefore = queryContainer(
      sourceContainer,
      "SELECT marker_id FROM app.imp037_restore_provenance LIMIT 1;",
    );
    assert.equal(sourceMarkerBefore.status, 0, sourceMarkerBefore.stderr);
    assert.equal(String(sourceMarkerBefore.stdout ?? "").trim(), provenanceMarker);

    const dump = execInContainer(
      sourceContainer,
      ["pg_dump", "-Fc", "-U", "boba_bear_logical_backup", "boba_recovery"],
      { encoding: "buffer", timeout: 180_000 },
    );
    assert.equal(dump.status, 0, String(dump.stderr ?? ""));
    const dumpBuffer = Buffer.isBuffer(dump.stdout) ? dump.stdout : Buffer.from(dump.stdout ?? "");
    assert.ok(dumpBuffer.length > 0);

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
      sourceIdentity: "tranche2-restored-app-source",
      sourceClassification: "production",
      candidate: {
        repositoryPath: "/home/ajoshi/repos/boba-bear-platform",
        branch: "test",
        commitSha: "tranche2-restored-app",
        tree: "tranche2-restored-app",
      },
      ageBin: ageTools.ageBin,
      dumpFn: async () => dumpBuffer,
    });
    assert.equal(backup.ok, true, backup.reason);

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

    const rehearsal = await runPortabilityRehearsal({
      runIdToRestore: backupRunId,
      objectStore,
      identityFile: identityPath,
      sourceIdentity: "tranche2-restored-app-source",
      sourceClassification: "production",
      sourceDatabaseUrl: `postgresql://boba_recovery:recovery-test-only@127.0.0.1:${sourcePort}/boba_recovery`,
      evidenceDir: path.join(work, "rehearsal-evidence"),
      ageBin: ageTools.ageBin,
      provisionTarget: true,
      retainTarget: true,
      env: controlledEnv,
    });
    assert.equal(rehearsal.ok, true, rehearsal.reason);
    provisioned = rehearsal.provisioned;
    assert.ok(provisioned?.appDatabaseUrlInternal, "restored target must expose appDatabaseUrlInternal");
    assert.equal(provisioned.networkInternalVerified, true);
    assert.equal(
      (rehearsal.validation?.results ?? []).some(
        (entry) => entry.code === PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED && entry.ok,
      ),
      true,
      JSON.stringify(rehearsal.validation?.results ?? [], null, 2),
    );

    // Positive restore provenance: same marker on restored target (from dump, not migrations).
    const restoredMarker = queryContainer(
      provisioned.containerName,
      "SELECT marker_id FROM app.imp037_restore_provenance LIMIT 1;",
    );
    assert.equal(restoredMarker.status, 0, restoredMarker.stderr || restoredMarker.stdout);
    assert.equal(String(restoredMarker.stdout ?? "").trim(), provenanceMarker);

    // Source still present with expected marker before app start.
    const sourceInspectPre = spawnSync(cli, ["inspect", sourceContainer], { encoding: "utf8" });
    assert.equal(sourceInspectPre.status, 0);
    const sourceMarkerPreApp = queryContainer(
      sourceContainer,
      "SELECT marker_id FROM app.imp037_restore_provenance LIMIT 1;",
    );
    assert.equal(sourceMarkerPreApp.status, 0);
    assert.equal(String(sourceMarkerPreApp.stdout ?? "").trim(), provenanceMarker);

    const started = await startRecoveredApplication({
      provisioned,
      targetIdentity: provisioned.targetIdentity,
      migrationsComplete: true,
      databaseAvailable: true,
      image: authImage,
      env: controlledEnv,
      healthTimeoutMs: 90_000,
      sourceUntouchedVerified: false,
    });
    assert.equal(started.ok, true, started.reason);
    assert.equal(started.QUALIFYING_APP_RECOVERY, "NO");
    assert.equal(started.restoredDbBound, true);
    assert.equal(started.providerSuppression, "SUPPRESSED");
    assert.equal(started.readinessPath, RECOVERED_APP_READINESS_PATH);
    assert.equal(started.readinessStatus, 200);
    assert.equal(started.sourceUntouched, undefined);
    appCleanup = started.cleanup;

    // Independently verify disposable source remains present and retains marker
    // after backup, restore, target migrations, and application startup.
    const sourceInspectPost = spawnSync(cli, ["inspect", sourceContainer], { encoding: "utf8" });
    assert.equal(sourceInspectPost.status, 0);
    const sourceMarkerPost = queryContainer(
      sourceContainer,
      "SELECT marker_id FROM app.imp037_restore_provenance LIMIT 1;",
    );
    assert.equal(sourceMarkerPost.status, 0);
    assert.equal(String(sourceMarkerPost.stdout ?? "").trim(), provenanceMarker);
    const sourceUntouched = true;

    // Marker still on restored target after app readiness (same target).
    const restoredMarkerPost = queryContainer(
      provisioned.containerName,
      "SELECT marker_id FROM app.imp037_restore_provenance LIMIT 1;",
    );
    assert.equal(restoredMarkerPost.status, 0);
    assert.equal(String(restoredMarkerPost.stdout ?? "").trim(), provenanceMarker);

    const evidencePayload = {
      LOCAL_RECOVERED_APP_STARTUP: "PASS",
      QUALIFYING_APP_RECOVERY: "NO",
      actual_restore: "PASS",
      restored_source_marker: "PASS",
      SOURCE_MARKER_IN_BACKUP: "YES",
      SOURCE_MARKER_ON_RESTORED_TARGET: "YES",
      post_restore_migration: "PASS",
      business_validation: "PASS",
      app_readiness_db_backed: "PASS",
      provider_suppression: "PASS",
      source_untouched: sourceUntouched ? "PASS" : "FAIL",
      health_live: "informational only",
      health_ready: "PASS",
      readiness_path: started.readinessPath,
      readiness_status: started.readinessStatus,
      restored_db_bound: "VERIFIED",
      actual_restored_target: "YES",
      encrypted_artifact: "YES",
      source_backup_created: "YES",
    };
    writeFileSync(path.join(work, "recovered-app-result.json"), JSON.stringify(evidencePayload, null, 2), "utf8");
    process.stdout.write(`TRANCHE2_RECOVERED_APP ${JSON.stringify(evidencePayload)}\n`);
  } finally {
    if (typeof appCleanup === "function") appCleanup();
    if (provisioned) cleanupProvisionedTarget(provisioned);
    spawnSync(cli, ["rm", "-f", sourceContainer], { encoding: "utf8" });
    cleanupAgeTools(ageTools.cleanupDir);
    rmSync(work, { recursive: true, force: true });
  }
});

test("repeatability: distinct RUN_ID targets do not collide", async (t) => {
  if (!heavyEnabled() && process.env.BOBA_RECOVERY_APP_STARTUP !== "1") {
    t.skip("set BOBA_RECOVERY_BUILD_POSTGRES=1, BOBA_RECOVERY_LAYER1_POSIX=1, or BOBA_RECOVERY_APP_STARTUP=1");
    return;
  }
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }

  const runA = generateRunId();
  const runB = generateRunId();
  assert.notEqual(runA, runB);

  const firstFailDir = mkdtempSync(path.join(os.tmpdir(), "boba-rep-fail-"));
  writeFileSync(
    path.join(firstFailDir, "FAILED.json"),
    JSON.stringify({ status: "FAILED", runId: runA, reason: "intentional-first-failure-evidence" }, null, 2),
    "utf8",
  );

  const a = await provisionLogicalTarget({
    runId: runA,
    sourceIdentity: "src-a",
    sourceClassification: "recovery",
    sourceDatabaseUrl: "postgresql://u:p@10.255.255.2:5432/a",
  });
  const b = await provisionLogicalTarget({
    runId: runB,
    sourceIdentity: "src-b",
    sourceClassification: "recovery",
    sourceDatabaseUrl: "postgresql://u:p@10.255.255.3:5432/b",
  });
  try {
    assert.equal(a.ok, true, a.reason);
    assert.equal(b.ok, true, b.reason);
    assert.notEqual(a.target.targetIdentity, b.target.targetIdentity);
    assert.notEqual(a.target.containerName, b.target.containerName);
    assert.notEqual(a.target.networkName, b.target.networkName);
    assert.ok(existsSync(path.join(firstFailDir, "FAILED.json")));
    // Later success must not erase first failure evidence.
    assert.equal(
      JSON.parse(readFileSync(path.join(firstFailDir, "FAILED.json"), "utf8")).reason,
      "intentional-first-failure-evidence",
    );
  } finally {
    if (a.ok) cleanupProvisionedTarget(a.target);
    if (b.ok) cleanupProvisionedTarget(b.target);
    // Cleanup of B must not remove A's already-cleaned resources or failure evidence.
    assert.ok(existsSync(path.join(firstFailDir, "FAILED.json")));
    rmSync(firstFailDir, { recursive: true, force: true });
  }
});
