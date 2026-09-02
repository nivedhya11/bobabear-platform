import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const script = path.resolve("scripts/environment/podman-compose.mjs");

function runCompose(initialDockerHost) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "boba-podman-compose-"));
  const provider = path.join(directory, "podman-compose");
  writeFileSync(provider, "#!/bin/sh\nprintf '%s' \"$DOCKER_HOST\"\n");
  chmodSync(provider, 0o755);
  try {
    return spawnSync(process.execPath, [script, "version"], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, DOCKER_HOST: initialDockerHost },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("podman-compose uses the rootless Podman socket when DOCKER_HOST is absent", () => {
  const result = runCompose("");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, `unix:///run/user/${process.getuid()}/podman/podman.sock`);
});

test("podman-compose overrides a stale Docker Desktop DOCKER_HOST", () => {
  const result = runCompose("npipe:////./pipe/docker_engine");
  assert.equal(result.status, 0);
  assert.equal(result.stdout, `unix:///run/user/${process.getuid()}/podman/podman.sock`);
  assert.doesNotMatch(result.stdout, /docker_engine/);
});
