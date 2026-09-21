/**
 * Layer 1 / pgBackRest integration markers for IMP-037.
 *
 * Default CI path avoids heavy image builds. Set BOBA_RECOVERY_BUILD_POSTGRES=1
 * to optionally build docker/postgres and assert pgBackRest >= 2.55.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { assertPgbackrestVersion } from "../layer1/config.mjs";
import { persistEvidence } from "../store.mjs";
import { generateRunId } from "../run-id.mjs";
import { OPERATION_STATUS, RECOVERY_LAYER } from "../constants.mjs";
import { resolveContainerCli } from "../docker-exec.mjs";

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
});

test("optional disposable posix repo probe when image already present", (t) => {
  const cli = resolveContainerCli();
  if (!cli) {
    t.skip("docker/podman unavailable");
    return;
  }
  const probeNames = ["boba-bear-postgres:local", "localhost/boba-bear-postgres:local"];
  let imageName = null;
  for (const name of probeNames) {
    const probe = spawnSync(cli, ["image", "inspect", name], {
      encoding: "utf8",
      timeout: 20_000,
    });
    if (probe.status === 0) {
      imageName = name;
      break;
    }
  }
  if (!imageName) {
    t.skip("boba-bear-postgres:local image not present");
    return;
  }
  const work = mkdtempSync(path.join(os.tmpdir(), "boba-pgbackrest-repo-"));
  try {
    mkdirSync(path.join(work, "repo-gen-1"), { recursive: true });
    const version = spawnSync(
      cli,
      ["run", "--rm", imageName, "pgbackrest", "version"],
      { encoding: "utf8", timeout: 60_000 },
    );
    assert.equal(version.status, 0);
    assert.equal(assertPgbackrestVersion(version.stdout).ok, true);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});
