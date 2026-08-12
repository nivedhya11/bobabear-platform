/**
 * Deterministic SHA-256 digest over authoritative menu source files (IMP-013).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS } from "./source-inventory";

export function computeSourceInventorySha256(projectRoot: string): string {
  const hash = createHash("sha256");
  const ordered = [...AUTHORITATIVE_MENU_SOURCE_RELATIVE_PATHS].sort();
  for (const relative of ordered) {
    const absolute = path.join(projectRoot, relative);
    const bytes = readFileSync(absolute);
    hash.update(relative);
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}
