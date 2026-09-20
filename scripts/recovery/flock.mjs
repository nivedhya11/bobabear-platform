/**
 * Host-local flock serialization for IMP-037 scheduled/heavy recovery ops.
 *
 * WAL archival / continuous archive-push MUST NOT use this lock
 * (`CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES`). Continuous WAL must
 * remain available while a heavy backup, retention, or drill holds the lock.
 *
 * Prefers the util-linux `flock` CLI (`flock -n`) to match the Linux host systemd model.
 */
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, unlinkSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { redactText } from "./redact.mjs";

export const HEAVY_OPS_LOCK_ENV = "BOBA_RECOVERY_HEAVY_LOCK_PATH";
export const DEFAULT_HEAVY_LOCK_PATH = "/var/lock/boba-recovery-heavy.lock";

/**
 * @typedef {object} HeavyOpLockOptions
 * @property {string} [lockPath]
 * @property {number} [waitMs]
 * @property {string} [operation]
 */

/**
 * @typedef {object} HeavyOpLockResult
 * @property {boolean} ok
 * @property {"ACQUIRED" | "SKIPPED_LOCK_HELD" | "FAILED"} status
 * @property {string} [reason]
 * @property {unknown} [result]
 */

/**
 * Acquire a host-local advisory lock, run `fn`, then release.
 * When the lock is held and `waitMs === 0`, returns SKIPPED_LOCK_HELD (never SUCCEEDED semantics).
 *
 * @param {HeavyOpLockOptions} options
 * @param {() => unknown | Promise<unknown>} fn
 * @returns {Promise<HeavyOpLockResult>}
 */
export async function withHeavyOpLock(options, fn) {
  if (typeof fn !== "function") {
    return { ok: false, status: "FAILED", reason: "heavy op callback is required" };
  }
  const waitMs = typeof options?.waitMs === "number" && Number.isFinite(options.waitMs) ? Math.max(0, options.waitMs) : 0;
  const lockPath = resolveLockPath(options?.lockPath);
  const operation = typeof options?.operation === "string" && options.operation.length > 0 ? options.operation : "heavy-op";

  try {
    mkdirSync(path.dirname(lockPath), { recursive: true });
    closeSync(openSync(lockPath, "a"));
  } catch (error) {
    return {
      ok: false,
      status: "FAILED",
      reason: redactText(`cannot prepare heavy op lock path: ${errorMessage(error)}`),
    };
  }

  const holdPath = `${lockPath}.${process.pid}.${Date.now()}.hold`;
  const waitArgs = waitMs > 0 ? ["-w", String(Math.max(1, Math.ceil(waitMs / 1000)))] : ["-n"];
  /** @type {import("node:child_process").ChildProcessWithoutNullStreams} */
  let child;
  try {
    child = /** @type {import("node:child_process").ChildProcessWithoutNullStreams} */ (
      spawn(
        "flock",
        [...waitArgs, lockPath, "sh", "-c", 'touch "$1"; while [ -e "$1" ]; do sleep 0.05; done', "hold", holdPath],
        { stdio: ["ignore", "ignore", "pipe"] },
      )
    );
  } catch (error) {
    return {
      ok: false,
      status: "FAILED",
      reason: redactText(`flock CLI unavailable: ${errorMessage(error)}`),
    };
  }

  const acquired = await waitForHold(holdPath, child, waitMs);
  if (!acquired) {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
    cleanupHold(holdPath);
    if (waitMs === 0) {
      return {
        ok: false,
        status: "SKIPPED_LOCK_HELD",
        reason: `heavy op lock held (${operation})`,
      };
    }
    return {
      ok: false,
      status: "FAILED",
      reason: `failed to acquire heavy op lock within waitMs (${operation})`,
    };
  }

  try {
    const result = await fn();
    return { ok: true, status: "ACQUIRED", result };
  } catch (error) {
    return {
      ok: false,
      status: "FAILED",
      reason: redactText(errorMessage(error)),
    };
  } finally {
    cleanupHold(holdPath);
    await waitForChildExit(child, 2000);
  }
}

/**
 * @param {string | undefined} lockPath
 * @returns {string}
 */
function resolveLockPath(lockPath) {
  if (typeof lockPath === "string" && lockPath.trim().length > 0) return lockPath.trim();
  const fromEnv = process.env[HEAVY_OPS_LOCK_ENV];
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_HEAVY_LOCK_PATH;
}

/**
 * @param {string} holdPath
 * @param {import("node:child_process").ChildProcess} child
 * @param {number} waitMs
 * @returns {Promise<boolean>}
 */
async function waitForHold(holdPath, child, waitMs) {
  const deadline = Date.now() + Math.max(waitMs, 0) + 2500;
  while (Date.now() < deadline) {
    if (existsSync(holdPath)) return true;
    if (child.exitCode != null) return false;
    await delay(25);
  }
  return existsSync(holdPath);
}

/**
 * @param {import("node:child_process").ChildProcess} child
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForChildExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode != null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve();
    }, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * @param {string} holdPath
 */
function cleanupHold(holdPath) {
  try {
    if (existsSync(holdPath)) unlinkSync(holdPath);
  } catch {
    // ignore
  }
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
