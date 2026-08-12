/**
 * Stable deterministic UUID (version-5 style) for IMP-013 manifest identities.
 */
import { createHash } from "node:crypto";

const NAMESPACE = "boba-bear-existing-menu-v1";

export function stableUuid(key: string): string {
  const digest = createHash("sha256").update(`${NAMESPACE}:${key}`).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function normalizeProductCode(name: string): string {
  const code = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(code) || code.length === 0 || code.length > 64) {
    throw new Error(`Unable to derive a valid product code from name "${name}".`);
  }
  return code;
}
