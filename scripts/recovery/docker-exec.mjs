/**
 * Docker / Compose helpers for IMP-037 recovery tooling.
 * Disposable postgres:18.4-trixie containers for tests — never production volumes.
 */
import { spawnSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { redactText } from "./redact.mjs";

export const DISPOSABLE_POSTGRES_IMAGE = "docker.io/library/postgres:18.4-trixie";

/**
 * Prefer docker when the engine is reachable; otherwise fall back to podman
 * (WSL/local without Docker Desktop). Never invent a success when neither works.
 * @returns {"docker"|"podman"|null}
 */
export function resolveContainerCli() {
  const docker = spawnSync("docker", ["info"], { encoding: "utf8", timeout: 15_000 });
  if (docker.status === 0) return "docker";
  const podman = spawnSync("podman", ["info"], { encoding: "utf8", timeout: 15_000 });
  if (podman.status === 0) return "podman";
  return null;
}

/**
 * Run a command inside the compose postgres service: `docker compose exec -T postgres ...`
 *
 * @param {object} options
 * @param {string[]} options.args
 * @param {string} [options.service]
 * @param {string} [options.composeFile]
 * @param {Function} [options.execFn]
 * @param {string} [options.cwd]
 * @param {NodeJS.ProcessEnv} [options.env]
 */
export function dockerComposeExecPostgres(options) {
  const service = options.service ?? "postgres";
  const args = ["compose"];
  if (options.composeFile) {
    args.push("-f", options.composeFile);
  }
  args.push("exec", "-T", service, ...(Array.isArray(options.args) ? options.args : []));

  const execFn =
    options.execFn ??
    ((command, commandArgs, opts) => {
      const result = spawnSync(command, commandArgs, {
        cwd: opts?.cwd,
        env: opts?.env ?? process.env,
        encoding: "utf8",
      });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: typeof result.stdout === "string" ? result.stdout : "",
        stderr: typeof result.stderr === "string" ? result.stderr : "",
      };
    });

  const cli = options.containerCli ?? resolveContainerCli() ?? "docker";
  const result = execFn(cli, args, { cwd: options.cwd, env: options.env });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: redactText(result.stdout ?? ""),
    stderr: redactText(result.stderr ?? ""),
    reason:
      result.status === 0
        ? undefined
        : redactText(result.stderr || `${cli} compose exec exited ${result.status}`),
  };
}

/**
 * Start an ephemeral PostgreSQL 18.4 container for disposable recovery tests.
 * Does NOT attach production named volumes.
 *
 * @param {object} [options]
 * @param {Function} [options.execFn]
 * @param {string} [options.image]
 * @param {string} [options.name]
 * @returns {{ ok: boolean, containerName?: string, reason?: string }}
 */
export function startEphemeralPostgres(options = {}) {
  const name = options.name ?? `boba-recovery-pg-${randomBytes(4).toString("hex")}`;
  const image = options.image ?? DISPOSABLE_POSTGRES_IMAGE;
  const execFn =
    options.execFn ??
    ((command, args) => {
      const result = spawnSync(command, args, { encoding: "utf8" });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    });

  const cli = options.containerCli ?? resolveContainerCli();
  if (!cli) {
    return { ok: false, reason: "neither docker nor podman is available" };
  }
  const result = execFn(cli, [
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "-e",
    "POSTGRES_PASSWORD=recovery-test-only",
    "-e",
    "POSTGRES_USER=boba_recovery",
    "-e",
    "POSTGRES_DB=boba_recovery",
    image,
  ]);
  if (result.status !== 0) {
    return {
      ok: false,
      reason: redactText(result.stderr || `failed to start ephemeral postgres (${image})`),
    };
  }
  return { ok: true, containerName: name, image, containerCli: cli };
}

/**
 * @param {object} options
 * @param {string} options.containerName
 * @param {Function} [options.execFn]
 */
export function stopEphemeralPostgres(options) {
  const execFn =
    options.execFn ??
    ((command, args) => {
      const result = spawnSync(command, args, { encoding: "utf8" });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    });
  const cli = options.containerCli ?? resolveContainerCli() ?? "docker";
  const result = execFn(cli, ["rm", "-f", options.containerName]);
  return {
    ok: result.status === 0,
    reason: result.status === 0 ? undefined : redactText(result.stderr || "failed to stop ephemeral postgres"),
  };
}

/**
 * Async spawn helper for long-running disposable containers when needed by callers.
 * @param {string} command
 * @param {string[]} args
 * @returns {import("node:child_process").ChildProcess}
 */
export function spawnDocker(command, args) {
  return spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
}
