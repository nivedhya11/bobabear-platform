/**
 * Local filesystem S3-like object store for disposable IMP-037 recovery tests.
 * Callers choose unique keys — this store never forces "latest" overwrite semantics.
 */
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * @param {{ localRoot: string, bucket?: string }} config
 */
export function createLocalObjectStore(config) {
  if (!config || typeof config.localRoot !== "string" || config.localRoot.trim().length === 0) {
    throw new Error("local object store requires localRoot");
  }
  const root = path.resolve(config.localRoot);
  const bucket = typeof config.bucket === "string" && config.bucket.trim() ? config.bucket.trim() : "local";
  mkdirSync(root, { recursive: true });

  return {
    backend: "local",
    bucket,
    localRoot: root,
    putObject,
    getObject,
    headObject,
    listObjects,
    deleteObject,
    verifyRemoteSha256,
  };

  /**
   * @param {{ key: string, body: Buffer | string | import("node:stream").Readable }} input
   */
  async function putObject(input) {
    const key = requireKey(input?.key);
    const destination = objectPath(key);
    mkdirSync(path.dirname(destination), { recursive: true });
    const body = input.body;
    if (Buffer.isBuffer(body) || typeof body === "string") {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
      writeFileSync(destination, buf);
      return { key, etag: etagOf(buf), size: buf.length };
    }
    if (body && typeof body === "object" && typeof /** @type {any} */ (body).pipe === "function") {
      await pipeline(/** @type {import("node:stream").Readable} */ (body), createWriteStream(destination));
      const stored = readFileSync(destination);
      return { key, etag: etagOf(stored), size: stored.length };
    }
    throw new Error("putObject body must be Buffer, string, or Readable");
  }

  /**
   * @param {{ key: string }} input
   */
  async function getObject(input) {
    const key = requireKey(input?.key);
    const filePath = objectPath(key);
    if (!existsSync(filePath)) {
      throw new Error(`object not found: ${key}`);
    }
    const body = readFileSync(filePath);
    return { body, etag: etagOf(body), key };
  }

  /**
   * @param {{ key: string }} input
   */
  async function headObject(input) {
    const key = requireKey(input?.key);
    const filePath = objectPath(key);
    if (!existsSync(filePath)) {
      return { exists: false, key };
    }
    const stat = statSync(filePath);
    const body = readFileSync(filePath);
    return { exists: true, key, size: stat.size, etag: etagOf(body) };
  }

  /**
   * @param {{ prefix?: string }} [input]
   */
  async function listObjects(input = {}) {
    const prefix = typeof input.prefix === "string" ? input.prefix : "";
    const keys = listKeysRecursive(root)
      .map((absolute) => path.relative(root, absolute).split(path.sep).join("/"))
      .filter((key) => (prefix ? key.startsWith(prefix) : true))
      .sort();
    return {
      contents: keys.map((key) => {
        const body = readFileSync(objectPath(key));
        return { key, size: body.length, etag: etagOf(body) };
      }),
    };
  }

  /**
   * @param {{ key: string }} input
   */
  async function deleteObject(input) {
    const key = requireKey(input?.key);
    const filePath = objectPath(key);
    if (existsSync(filePath)) rmSync(filePath, { force: true });
    return { deleted: true, key };
  }

  /**
   * @param {{ key: string, expectedSha256Hex: string }} input
   */
  async function verifyRemoteSha256(input) {
    const key = requireKey(input?.key);
    const expected = String(input?.expectedSha256Hex ?? "")
      .trim()
      .toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expected)) {
      return { ok: false, key, reason: "expectedSha256Hex must be 64 lowercase hex characters" };
    }
    const filePath = objectPath(key);
    if (!existsSync(filePath)) {
      return { ok: false, key, reason: "remote object not found" };
    }
    const body = readFileSync(filePath);
    const actual = createHash("sha256").update(body).digest("hex");
    if (actual !== expected) {
      return { ok: false, key, reason: "remote SHA-256 mismatch", actualSha256Hex: actual };
    }
    return { ok: true, key, actualSha256Hex: actual };
  }

  /**
   * @param {string} key
   */
  function objectPath(key) {
    const normalized = key.replace(/^\/+/, "");
    const resolved = path.resolve(root, normalized);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error("object key escapes localRoot");
    }
    return resolved;
  }
}

/**
 * @param {unknown} key
 * @returns {string}
 */
function requireKey(key) {
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error("object key is required");
  }
  return key.trim().replace(/^\/+/, "");
}

/**
 * @param {Buffer} body
 * @returns {string}
 */
function etagOf(body) {
  return createHash("md5").update(body).digest("hex");
}

/**
 * @param {string} directory
 * @returns {string[]}
 */
function listKeysRecursive(directory) {
  if (!existsSync(directory)) return [];
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...listKeysRecursive(absolute));
    else if (entry.isFile()) out.push(absolute);
  }
  return out;
}

export { Readable, createReadStream };
