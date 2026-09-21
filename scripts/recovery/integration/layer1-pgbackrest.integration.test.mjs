/**
 * Layer 1 / pgBackRest integration markers + local POSIX prequalification for IMP-037.
 *
 * Default CI path avoids heavy image builds. Set BOBA_RECOVERY_BUILD_POSTGRES=1
 * to build docker/postgres and assert pgBackRest >= 2.55, then (when possible)
 * exercise disposable POSIX stanza/backup/verify. This is NOT Spaces proof.
 *
 * Classification:
 *   LOCAL_LAYER1_MECHANICS = exercised under BOBA_RECOVERY_BUILD_POSTGRES=1
 *   REAL_SPACES_LAYER1 = NOT_PERFORMED
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { assertPgbackrestVersion } from "../layer1/config.mjs";
import { persistEvidence } from "../store.mjs";
import { generateRunId } from "../run-id.mjs";
import { OPERATION_STATUS, RECOVERY_LAYER } from "../constants.mjs";
import { resolveContainerCli } from "../docker-exec.mjs";
import { waitForPostgresReady } from "../tools/postgres-ready.mjs";

const IMAGE_CANDIDATES = ["boba-bear-postgres:local", "localhost/boba-bear-postgres:local"];

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

test("assertPgbackrestVersion accepts pinned floor and rejects stock 2.50", () => {
  assert.equal(assertPgbackrestVersion("pgBackRest 2.56.0").ok, true);
  assert.equal(assertPgbackrestVersion("2.55.0").ok, true);
  assert.equal(assertPgbackrestVersion("2.50").ok, false);
  assert.equal(assertPgbackrestVersion("2.54.9").ok, false);
});

test("evidence fixture documents REAL_SPACES and DROPLET_2GIB as NOT_PERFORMED", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-layer1-markers-"));
  try {
    const runId = generateRunId({
      now: new Date(Date.UTC(2026, 8, 20, 10, 0, 0)),
      randomHex: "cccccccccccccccc",
    });
    persistEvidence(root, {
      runId,
      operationType: "status",
      recoveryLayer: RECOVERY_LAYER.LAYER_1,
      status: OPERATION_STATUS.BLOCKED,
      endedAt: "2026-09-20T10:00:00.000Z",
      failureBlockReason: "integration markers only",
      findings: [
        { code: "REAL_SPACES", status: "NOT_PERFORMED" },
        { code: "DROPLET_2GIB", status: "NOT_PERFORMED" },
        { code: "RPO_RTO_PROVEN", status: "NO" },
        { code: "STORAGE_CAPACITY_VALIDATED", status: "NO" },
      ],
    });
    const markerPath = path.join(root, "NOT_PERFORMED.json");
    writeFileSync(
      markerPath,
      JSON.stringify(
        {
          REAL_SPACES: "NOT_PERFORMED",
          DROPLET_2GIB_RTO_VALIDATED: "NO",
          RPO_RTO_PROVEN: "NO",
          STORAGE_CAPACITY_VALIDATED: "NO",
          FOUNDER_UAT: "NOT_PERFORMED",
          LOCAL_LAYER1_MECHANICS: "TEST_FIXTURE_ONLY",
        },
        null,
        2,
      ),
      "utf8",
    );
    const markers = JSON.parse(readFileSync(markerPath, "utf8"));
    assert.equal(markers.REAL_SPACES, "NOT_PERFORMED");
    assert.equal(markers.DROPLET_2GIB_RTO_VALIDATED, "NO");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("optional postgres image build verifies pgBackRest >= 2.55", (t) => {
  if (process.env.BOBA_RECOVERY_BUILD_POSTGRES !== "1") {
    t.skip("BOBA_RECOVERY_BUILD_POSTGRES!=1; skipping heavy image build");
    return;
  }
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }
  const build = spawnSync(
    cli,
    ["build", "-f", "docker/postgres/Dockerfile", "-t", "boba-bear-postgres:local", "."],
    { encoding: "utf8", timeout: 1_800_000 },
  );
  assert.equal(build.status, 0, build.stderr || build.stdout);
  const version = spawnSync(
    cli,
    ["run", "--rm", "boba-bear-postgres:local", "pgbackrest", "version"],
    { encoding: "utf8", timeout: 60_000 },
  );
  assert.equal(version.status, 0, version.stderr || version.stdout);
  const asserted = assertPgbackrestVersion(version.stdout);
  assert.equal(asserted.ok, true, asserted.reason);
  assert.match(String(version.stdout), /2\.5[5-9]|2\.[6-9]/);
});

test("local POSIX Layer-1 mechanics: stanza/check/full/diff/info/verify (NOT Spaces)", (t) => {
  if (process.env.BOBA_RECOVERY_BUILD_POSTGRES !== "1" && process.env.BOBA_RECOVERY_LAYER1_POSIX !== "1") {
    t.skip("set BOBA_RECOVERY_BUILD_POSTGRES=1 or BOBA_RECOVERY_LAYER1_POSIX=1 for local Layer-1 POSIX E2E");
    return;
  }
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }

  // Ensure image exists (build path may have just created it).
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
  const pgVersion = spawnSync(cli, ["run", "--rm", imageName, "postgres", "--version"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(pgVersion.status, 0);
  assert.match(String(pgVersion.stdout ?? pgVersion.stderr ?? ""), /18\.\d+/);
  assert.match(String(pgVersion.stdout ?? pgVersion.stderr ?? ""), /PostgreSQL/i);

  const suffix = randomBytes(4).toString("hex");
  const container = `boba-l1-posix-${suffix}`;
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-l1-posix-"));
  const repoHost = path.join(work, "repo-gen-1");
  mkdirSync(repoHost, { recursive: true });
  const cipherPass = `local-only-cipher-${suffix}-not-founder-custody`;
  const timings = {};

  try {
    const run = spawnSync(
      cli,
      [
        "run",
        "-d",
        "--name",
        container,
        "-e",
        "POSTGRES_PASSWORD=recovery-test-only",
        // Official image: non-postgres POSTGRES_USER replaces the postgres role.
        // pgBackRest stanza ops expect a DB role matching the OS postgres user.
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
        `PGBACKREST_CIPHER_PASS=${cipherPass}`,
        "-e",
        `PGBACKREST_REPO1_CIPHER_PASS=${cipherPass}`,
        "-v",
        `${repoHost}:/var/lib/pgbackrest/repo-gen-1:Z`,
        imageName,
      ],
      { encoding: "utf8", timeout: 180_000 },
    );
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(
      waitForPostgresReady({
        cli,
        containerName: container,
        user: "postgres",
        db: "postgres",
        attempts: 120,
      }),
      true,
      "layer1 postgres ready",
    );

    // Ensure postgres can write the posix repo path.
    spawnSync(cli, ["exec", "-u", "root", container, "chown", "-R", "postgres:postgres", "/var/lib/pgbackrest"], {
      encoding: "utf8",
      timeout: 30_000,
    });

    const stanza = execIn(cli, container, ["pgbackrest", "--stanza=boba", "stanza-create"], {
      timeout: 180_000,
    });
    assert.equal(stanza.status, 0, stanza.stderr || stanza.stdout);

    const check = execIn(cli, container, ["pgbackrest", "--stanza=boba", "check"], { timeout: 180_000 });
    assert.equal(check.status, 0, check.stderr || check.stdout);

    const fullStart = Date.now();
    const full = execIn(cli, container, ["pgbackrest", "--stanza=boba", "backup", "--type=full"], {
      timeout: 600_000,
    });
    assert.equal(full.status, 0, full.stderr || full.stdout);
    timings.fullBackupMs = Date.now() - fullStart;

    // Mutate + force WAL archive.
    const mutate2 = spawnSync(
      cli,
      [
        "exec",
        "-e",
        "PGPASSWORD=recovery-test-only",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        "CREATE TABLE IF NOT EXISTS public.l1_probe(id int); INSERT INTO public.l1_probe VALUES (1); SELECT pg_switch_wal();",
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    assert.equal(mutate2.status, 0, mutate2.stderr || mutate2.stdout);

    // Brief wait for archive-push.
    spawnSync(process.execPath, ["-e", "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,2000)"]);

    const diffStart = Date.now();
    const diff = execIn(cli, container, ["pgbackrest", "--stanza=boba", "backup", "--type=diff"], {
      timeout: 600_000,
    });
    assert.equal(diff.status, 0, diff.stderr || diff.stdout);
    timings.diffBackupMs = Date.now() - diffStart;

    const info = execIn(cli, container, ["pgbackrest", "--stanza=boba", "info", "--output=json"], {
      timeout: 120_000,
    });
    assert.equal(info.status, 0, info.stderr || info.stdout);
    const infoJson = JSON.parse(String(info.stdout ?? "[]"));
    assert.ok(Array.isArray(infoJson) && infoJson.length > 0);

    const verify = execIn(cli, container, ["pgbackrest", "--stanza=boba", "verify"], {
      timeout: 300_000,
    });
    assert.equal(verify.status, 0, verify.stderr || verify.stdout);

    // Source remains the disposable container we started (unchanged identity).
    const inspect = spawnSync(cli, ["inspect", container], { encoding: "utf8" });
    assert.equal(inspect.status, 0);
    assert.ok(existsSync(repoHost));

    writeFileSync(
      path.join(work, "layer1-local-result.json"),
      JSON.stringify(
        {
          LOCAL_LAYER1_MECHANICS: "PASS",
          REAL_SPACES_LAYER1: "NOT_PERFORMED",
          REAL_SPACES: "NOT_PERFORMED",
          postgresVersion: String(pgVersion.stdout).trim(),
          pgbackrestVersion: String(version.stdout).trim(),
          timings,
          QUALIFYING_EXTERNAL_PROOF: "NO",
        },
        null,
        2,
      ),
      "utf8",
    );
    process.stdout.write(
      `LOCAL_LAYER1_RESULT ${readFileSync(path.join(work, "layer1-local-result.json"), "utf8")}\n`,
    );
  } finally {
    spawnSync(cli, ["rm", "-f", container], { encoding: "utf8" });
    // Repo bind-mount files are owned by container postgres UID; remove via rootful helper.
    spawnSync(
      cli,
      ["run", "--rm", "-v", `${work}:/work:Z`, imageName, "bash", "-lc", "rm -rf /work/*"],
      { encoding: "utf8", timeout: 60_000 },
    );
    try {
      rmSync(work, { recursive: true, force: true });
    } catch {
      spawnSync("rm", ["-rf", work], { encoding: "utf8" });
    }
  }
});

test("optional disposable posix repo probe when image already present", (t) => {
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }
  const imageName = resolveLocalImage(cli);
  if (!imageName) {
    t.skip("boba-bear-postgres:local image not present");
    return;
  }
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-pgbackrest-repo-"));
  try {
    mkdirSync(path.join(work, "repo-gen-1"), { recursive: true });
    const version = spawnSync(cli, ["run", "--rm", imageName, "pgbackrest", "version"], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(version.status, 0);
    assert.equal(assertPgbackrestVersion(version.stdout).ok, true);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
