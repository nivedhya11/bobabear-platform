/**
 * Stable PostgreSQL readiness for disposable recovery containers.
 * A single pg_isready during docker-entrypoint init can race the post-init restart.
 */
import { spawnSync } from "node:child_process";

/**
 * @param {object} options
 * @param {string} options.cli
 * @param {string} options.containerName
 * @param {string} [options.user]
 * @param {string} [options.db]
 * @param {number} [options.attempts]
 * @param {number} [options.stableCount]
 * @param {number} [options.settleMs]
 * @param {Function} [options.execFn]
 * @returns {boolean}
 */
export function waitForPostgresReady(options) {
  const cli = options.cli;
  const containerName = options.containerName;
  const user = options.user ?? "boba_recovery";
  const db = options.db ?? "boba_recovery";
  const attempts = options.attempts ?? 90;
  const stableCount = options.stableCount ?? 3;
  const settleMs = options.settleMs ?? 500;
  const execFn =
    options.execFn ??
    ((command, args, opts = {}) =>
      spawnSync(command, args, {
        encoding: "utf8",
        timeout: opts.timeout ?? 10_000,
      }));

  let consecutive = 0;
  for (let i = 0; i < attempts; i += 1) {
    const probe = execFn(cli, ["exec", containerName, "pg_isready", "-U", user, "-d", db], {
      timeout: 10_000,
    });
    if (probe.status === 0) {
      consecutive += 1;
      if (consecutive >= stableCount) return true;
    } else {
      consecutive = 0;
    }
    spawnSync(process.execPath, [
      "-e",
      `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,${settleMs})`,
    ]);
  }
  return false;
}
