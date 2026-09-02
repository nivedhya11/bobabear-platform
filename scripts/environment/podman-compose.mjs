#!/usr/bin/env node
/** The sole repository-supported Compose entrypoint for the rootless Podman WSL runtime. */
import { spawnSync } from "node:child_process";
import process from "node:process";

const socket = `unix:///run/user/${process.getuid()}/podman/podman.sock`;
const result = spawnSync("podman-compose", process.argv.slice(2), {
  stdio: "inherit",
  env: { ...process.env, DOCKER_HOST: socket },
});

if (result.error) {
  console.error(`podman-compose is required for BOBA Podman WSL commands: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
