// Pure, dependency-free helpers for parsing and updating .env-style files.
//
// Deliberately conservative: this is not a full dotenv-compatible parser
// (no multi-line values, no export prefix, no quoting rules beyond simple
// wrapping). It only needs to handle the flat KEY=value files this
// repository already uses (.env.local, .env.docker.local).
import { randomBytes } from "node:crypto";

const KEY_LINE_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

/**
 * Parse env-file text into an ordered list of lines, each tagged with
 * whether it declares a key (and which one). Comments, blank lines, and
 * malformed lines are preserved verbatim and untagged.
 *
 * @param {string} content
 * @returns {{ lines: Array<{ raw: string, key: string | null }> }}
 */
export function parseEnvFile(content) {
  const rawLines = content.length === 0 ? [] : content.split("\n");
  const lines = rawLines.map((raw) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return { raw, key: null };
    }
    const match = KEY_LINE_PATTERN.exec(trimmed);
    return { raw, key: match ? match[1] : null };
  });
  return { lines };
}

/**
 * Extract a flat `{ key: value }` map from parsed env-file content.
 * Returns `{ ok: false }` if the same key is declared more than once with
 * *different* values — that is treated as malformed/ambiguous rather than
 * "last write wins", so a caller can fail safely instead of guessing.
 *
 * @param {ReturnType<typeof parseEnvFile>} parsed
 */
export function extractValues(parsed) {
  /** @type {Record<string, string>} */
  const values = {};
  const seen = new Set();
  for (const { raw, key } of parsed.lines) {
    if (key === null) continue;
    const trimmed = raw.trim();
    const match = KEY_LINE_PATTERN.exec(trimmed);
    const value = match ? match[2] : "";
    if (seen.has(key) && values[key] !== value) {
      return { ok: false, key };
    }
    seen.add(key);
    values[key] = value;
  }
  return { ok: true, values };
}

/**
 * Insert or update only the given keys in env-file text, preserving every
 * other line (including comments, ordering, and unrelated keys) exactly.
 * Keys not already present are appended at the end, each on its own line.
 *
 * @param {string} content
 * @param {Record<string, string>} updates
 */
export function upsertEnvValues(content, updates) {
  const parsed = parseEnvFile(content);
  const remainingKeys = new Set(Object.keys(updates));
  const outLines = [];

  for (const { raw, key } of parsed.lines) {
    if (key !== null && Object.prototype.hasOwnProperty.call(updates, key)) {
      outLines.push(`${key}=${updates[key]}`);
      remainingKeys.delete(key);
    } else {
      outLines.push(raw);
    }
  }

  // Trim a single trailing blank line so appends don't accumulate blank
  // lines across repeated runs, then append anything not already present.
  while (outLines.length > 0 && outLines[outLines.length - 1] === "") {
    outLines.pop();
  }

  for (const key of Object.keys(updates)) {
    if (remainingKeys.has(key)) {
      outLines.push(`${key}=${updates[key]}`);
    }
  }

  return `${outLines.join("\n")}\n`;
}

const URL_SAFE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate a strong, URL-safe random password using `node:crypto`.
 * Restricted to an unreserved alphanumeric alphabet (no `+`, `/`, `=`, `:`,
 * `@`, `/`) so the result is always safe to embed directly in a
 * `postgresql://` connection string without percent-encoding.
 *
 * @param {number} length
 */
export function generatePassword(length = 32) {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i += 1) {
    const index = bytes[i] % URL_SAFE_ALPHABET.length;
    out += URL_SAFE_ALPHABET[index];
  }
  return out;
}
