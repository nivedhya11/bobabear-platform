/**
 * IMP-037 RUN_ID: unique per operation, UTC timestamp + cryptographically random,
 * filesystem/object-key safe. No secret or customer data.
 */
import { randomBytes } from "node:crypto";

const RUN_ID_PATTERN = /^(\d{8}T\d{6}Z)-([0-9a-f]{16})$/;

/**
 * @param {{ now?: Date, randomHex?: string }} [options]
 * @returns {string}
 */
export function generateRunId(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new Error("RUN_ID timestamp is invalid");
  }
  const timestamp = formatUtcCompact(now);
  const randomHex = options.randomHex ?? randomBytes(8).toString("hex");
  if (!/^[0-9a-f]{16}$/.test(randomHex)) {
    throw new Error("RUN_ID random component must be 16 lowercase hex characters");
  }
  return `${timestamp}-${randomHex}`;
}

/**
 * @param {unknown} value
 * @returns {{ ok: true, runId: string, timestampUtc: string, randomHex: string, instant: Date } | { ok: false, reason: string }}
 */
export function parseRunId(value) {
  if (typeof value !== "string" || value.length === 0) {
    return { ok: false, reason: "RUN_ID must be a non-empty string" };
  }
  if (/[A-Z]/.test(value.replace(/T|Z/g, "")) && !RUN_ID_PATTERN.test(value)) {
    return { ok: false, reason: "RUN_ID is malformed" };
  }
  const match = RUN_ID_PATTERN.exec(value);
  if (!match) {
    return { ok: false, reason: "RUN_ID is malformed" };
  }
  const [, timestamp, randomHex] = match;
  const instant = parseUtcCompact(timestamp);
  if (!instant) {
    return { ok: false, reason: "RUN_ID timestamp is not a valid UTC instant" };
  }
  if (formatUtcCompact(instant) !== timestamp) {
    return { ok: false, reason: "RUN_ID timestamp is not a valid UTC instant" };
  }
  return {
    ok: true,
    runId: value,
    timestampUtc: timestamp,
    randomHex,
    instant,
  };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidRunId(value) {
  return parseRunId(value).ok === true;
}

/**
 * @param {string} runId
 * @returns {Date}
 */
export function runIdInstant(runId) {
  const parsed = parseRunId(runId);
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }
  return parsed.instant;
}

/**
 * @param {Date} date
 * @returns {string} YYYYMMDDTHHMMSSZ
 */
export function formatUtcCompact(date) {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * @param {string} compact
 * @returns {Date | null}
 */
function parseUtcCompact(compact) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(compact);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() + 1 !== month ||
    instant.getUTCDate() !== day ||
    instant.getUTCHours() !== hour ||
    instant.getUTCMinutes() !== minute ||
    instant.getUTCSeconds() !== second
  ) {
    return null;
  }
  return instant;
}
