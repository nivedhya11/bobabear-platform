/**
 * age encrypt/decrypt wrappers for IMP-037 Layer 2.
 * Production backup encrypt path uses recipients only — identity/private key FORBIDDEN.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { redactText } from "../redact.mjs";

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveAgeBinary(env = process.env) {
  if (typeof env.BOBA_RECOVERY_AGE_BIN === "string" && env.BOBA_RECOVERY_AGE_BIN.trim()) {
    return env.BOBA_RECOVERY_AGE_BIN.trim();
  }
  if (typeof env.AGE_BIN === "string" && env.AGE_BIN.trim()) {
    return env.AGE_BIN.trim();
  }
  return "age";
}

/**
 * Stable non-secret reference for metadata (hash of public recipient string).
 * @param {string} recipient
 * @returns {string}
 */
export function fingerprintRecipient(recipient) {
  if (typeof recipient !== "string" || recipient.trim().length === 0) {
    throw new Error("recipient is required for fingerprint");
  }
  return createHash("sha256").update(recipient.trim(), "utf8").digest("hex").slice(0, 16);
}

/**
 * Encrypt plaintext to age ciphertext using recipients only.
 * `identityFile` is FORBIDDEN on the encrypt path.
 *
 * @param {object} options
 * @param {import("node:stream").Readable | Buffer | string} [options.plaintextStream]
 * @param {import("node:stream").Readable | Buffer | string} [options.plaintext]
 * @param {string[]} options.recipients
 * @param {string} [options.ageBin]
 * @param {string} [options.outputPath]
 * @param {unknown} [options.identityFile]
 * @returns {Promise<{ ok: true, outputPath: string, ciphertext: Buffer } | { ok: false, reason: string }>}
 */
export async function encryptToAge(options) {
  if (options?.identityFile != null) {
    return {
      ok: false,
      reason: "identityFile / private key is FORBIDDEN on the age encrypt (backup) path",
    };
  }
  const recipients = Array.isArray(options?.recipients)
    ? options.recipients.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];
  if (recipients.length === 0) {
    return { ok: false, reason: "age encrypt requires at least one recipient" };
  }
  const ageBin = options.ageBin ?? resolveAgeBinary();
  const source = options.plaintextStream ?? options.plaintext;
  if (source == null) {
    return { ok: false, reason: "plaintextStream or plaintext is required" };
  }

  const outputPath =
    typeof options.outputPath === "string" && options.outputPath.length > 0
      ? options.outputPath
      : path.join(tmpdir(), `boba-age-enc-${process.pid}-${Date.now()}.age`);

  const args = [];
  for (const recipient of recipients) {
    args.push("-r", recipient.trim());
  }
  args.push("-o", outputPath);

  try {
    await runAge(ageBin, args, toReadable(source));
    const ciphertext = readFileSync(outputPath);
    return { ok: true, outputPath, ciphertext };
  } catch (error) {
    try {
      if (existsSync(outputPath)) unlinkSync(outputPath);
    } catch {
      // ignore
    }
    return { ok: false, reason: redactText(errorMessage(error)) };
  }
}

/**
 * Decrypt age ciphertext for restore/drill only (requires identity file).
 *
 * @param {object} options
 * @param {Buffer | string} options.ciphertext
 * @param {string} options.identityFile
 * @param {string} [options.ageBin]
 * @param {string} [options.outputPath]
 * @returns {Promise<{ ok: true, outputPath: string, plaintext: Buffer } | { ok: false, reason: string }>}
 */
export async function decryptFromAge(options) {
  if (typeof options?.identityFile !== "string" || options.identityFile.trim().length === 0) {
    return { ok: false, reason: "identityFile is required for age decrypt (restore/drill)" };
  }
  const ageBin = options.ageBin ?? resolveAgeBinary();
  const outputPath =
    typeof options.outputPath === "string" && options.outputPath.length > 0
      ? options.outputPath
      : path.join(tmpdir(), `boba-age-dec-${process.pid}-${Date.now()}.dump`);
  const inputPath = path.join(tmpdir(), `boba-age-in-${process.pid}-${Date.now()}.age`);
  try {
    const ciphertext = Buffer.isBuffer(options.ciphertext)
      ? options.ciphertext
      : Buffer.from(String(options.ciphertext ?? ""), "utf8");
    writeFileSync(inputPath, ciphertext);
    await runAge(ageBin, ["-d", "-i", options.identityFile.trim(), "-o", outputPath, inputPath], null);
    const plaintext = readFileSync(outputPath);
    return { ok: true, outputPath, plaintext };
  } catch (error) {
    try {
      if (existsSync(outputPath)) unlinkSync(outputPath);
    } catch {
      // ignore
    }
    return { ok: false, reason: redactText(errorMessage(error)) };
  } finally {
    try {
      if (existsSync(inputPath)) unlinkSync(inputPath);
    } catch {
      // ignore
    }
  }
}

/**
 * @param {string} ageBin
 * @param {string[]} args
 * @param {import("node:stream").Readable | null} stdin
 * @returns {Promise<void>}
 */
function runAge(ageBin, args, stdin) {
  return new Promise((resolve, reject) => {
    const child = spawn(ageBin, args, { stdio: [stdin ? "pipe" : "ignore", "ignore", "pipe"] });
    /** @type {Buffer[]} */
    const errChunks = [];
    child.stderr.on("data", (chunk) => errChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(redactText(Buffer.concat(errChunks).toString("utf8") || `age exited ${code}`)));
    });
    if (stdin && child.stdin) {
      pipeline(stdin, child.stdin).catch((error) => reject(error));
    }
  });
}

/**
 * @param {import("node:stream").Readable | Buffer | string} source
 * @returns {import("node:stream").Readable}
 */
function toReadable(source) {
  if (Buffer.isBuffer(source) || typeof source === "string") {
    return Readable.from([Buffer.isBuffer(source) ? source : Buffer.from(source, "utf8")]);
  }
  return /** @type {import("node:stream").Readable} */ (source);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
