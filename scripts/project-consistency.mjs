#!/usr/bin/env node
/**
 * Project governance consistency checker (read-only).
 *
 * Validates canonical authority documents, ROADMAP↔STATE alignment, decision
 * register structural integrity, and robust technical/static-web checks.
 * Does not rewrite docs or mutate source.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @typedef {{ ok: boolean, code?: string, message: string }} Finding */

/** @type {Finding[]} */
const findings = [];

function fail(code, message) {
  findings.push({ ok: false, code, message });
}

function note(message) {
  findings.push({ ok: true, message });
}

/**
 * Resolve a path under docs/platform with case-insensitive fallback (NTFS/WSL).
 * Prefer {@link resolveExactRelativeFile} for CURRENT canonical authorities that
 * must be portable across case-sensitive checkouts.
 * @param {string} preferredRelative
 */
function resolvePlatformDoc(preferredRelative) {
  const preferred = path.join(projectRoot, preferredRelative);
  if (existsSync(preferred)) return preferred;
  const dir = path.dirname(preferred);
  const base = path.basename(preferred);
  if (!existsSync(dir)) return preferred;
  const match = readdirSync(dir).find((name) => name.toLowerCase() === base.toLowerCase());
  return match ? path.join(dir, match) : preferred;
}

/**
 * Resolve a repository-relative file by exact directory-entry basename match.
 * Does not accept case-insensitive aliases (critical on /mnt/c 9p).
 * @param {string} relativePath
 * @returns {string | null} absolute path, or null if exact entry missing
 */
function resolveExactRelativeFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const abs = path.join(projectRoot, normalized);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  if (!names.includes(base)) return null;
  const exactAbs = path.join(dir, base);
  try {
    if (!statSync(exactAbs).isFile()) return null;
  } catch {
    return null;
  }
  return exactAbs;
}

/** Canonical Decision Register pathname (tracked + portable). */
const DECISION_REGISTER_REL = "docs/platform/decision-register.md";

/**
 * Confirm git tracks the exact relative pathname when a real HEAD exists.
 * @param {string} relativePath
 * @returns {"exact" | "missing" | "unavailable"}
 */
function gitTracksExactPath(relativePath) {
  const head = spawnSync("git", ["-C", projectRoot, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
  });
  if (head.error || head.status !== 0) return "unavailable";

  const result = spawnSync(
    "git",
    ["-C", projectRoot, "ls-files", "--full-name", "--", relativePath],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) return "unavailable";
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.includes(relativePath) ? "exact" : "missing";
}

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
function parseGovernanceMeta(text) {
  const match = text.match(/<!--\s*governance-meta\s*([\s\S]*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * @param {string} relativePath
 * @param {string} expectedAuthority
 * @param {string[]} requiredKeys
 * @param {{ exact?: boolean }} [options]
 */
function loadCanonical(relativePath, expectedAuthority, requiredKeys, options = {}) {
  const abs = options.exact ? resolveExactRelativeFile(relativePath) : resolvePlatformDoc(relativePath);
  if (!abs || !existsSync(abs)) {
    if (options.exact && !resolveExactRelativeFile(relativePath)) {
      const dir = path.join(projectRoot, path.dirname(relativePath));
      let hint = "";
      try {
        const base = path.basename(relativePath);
        const ci = readdirSync(dir).find((n) => n.toLowerCase() === base.toLowerCase());
        if (ci && ci !== base) {
          fail(
            "CANONICAL_PATH_CASE",
            `Expected exact path ${relativePath} but directory entry is ${path.posix.join(path.dirname(relativePath).replace(/\\/g, "/"), ci)}`,
          );
          return null;
        }
      } catch {
        /* missing dir handled below */
      }
      fail("CANONICAL_MISSING", `Missing exact canonical document: ${relativePath}${hint}`);
      return null;
    }
    fail("CANONICAL_MISSING", `Missing canonical document: ${relativePath}`);
    return null;
  }
  const text = readFileSync(abs, "utf8");
  const meta = parseGovernanceMeta(text);
  if (!meta) {
    fail("META_MISSING", `${relativePath}: missing or unparseable governance-meta block`);
    return null;
  }
  if (meta.status !== "CURRENT") {
    fail("META_STATUS", `${relativePath}: status must be CURRENT (got ${JSON.stringify(meta.status)})`);
  }
  if (meta.authority !== expectedAuthority) {
    fail(
      "META_AUTHORITY",
      `${relativePath}: authority must be ${expectedAuthority} (got ${JSON.stringify(meta.authority)})`,
    );
  }
  for (const key of requiredKeys) {
    if (!(key in meta)) {
      fail("META_KEY", `${relativePath}: missing metadata key ${key}`);
    }
  }
  note(`${relativePath}: governance-meta OK`);
  return { abs, text, meta };
}

function nullishEqual(a, b) {
  const norm = (v) => (v === undefined || v === null || v === "null" ? null : v);
  return norm(a) === norm(b);
}

function checkRoadmapState(roadmap, state) {
  if (!roadmap || !state) return;
  const pairs = [
    ["acceptedThrough", roadmap.meta.acceptedThrough, state.meta.acceptedThrough],
    ["currentProductSlice", roadmap.meta.currentProductSlice, state.meta.currentProductSlice],
    ["nextProductSlice", roadmap.meta.nextProductSlice, state.meta.nextProductSlice],
  ];
  for (const [name, a, b] of pairs) {
    if (!nullishEqual(a, b)) {
      fail("ROADMAP_STATE_MISMATCH", `${name}: ROADMAP=${JSON.stringify(a)} STATE=${JSON.stringify(b)}`);
    } else {
      note(`ROADMAP↔STATE ${name} aligned (${JSON.stringify(a)})`);
    }
  }

  const expected = {
    acceptedThrough: "IMP-025",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-026",
    gtmBoundary: "IMP-040",
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = key === "gtmBoundary" ? roadmap.meta.gtmBoundary : roadmap.meta[key];
    if (!nullishEqual(actual, expectedValue)) {
      fail(
        "POSITION_UNEXPECTED",
        `Expected ${key}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`,
      );
    }
  }

  // Slice ledger uniqueness from CURRENT ROADMAP tables only (exclude historical notice).
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const ledgerText = `${acceptedSection}\n${futureSection}`;
  const idName = new Map();
  const rowRe = /\|\s*(IMP-\d+A?)\s*\|\s*([^|]+)\|/g;
  let m;
  while ((m = rowRe.exec(ledgerText)) !== null) {
    const id = m[1];
    const name = m[2].trim();
    if (name.toLowerCase() === "capability") continue;
    if (idName.has(id) && idName.get(id) !== name) {
      fail("IMP_IDENTITY_COLLISION", `${id} maps to both "${idName.get(id)}" and "${name}"`);
    }
    idName.set(id, name);
  }
  if (!idName.has(String(roadmap.meta.acceptedThrough))) {
    fail("ACCEPTED_THROUGH_MISSING", `acceptedThrough ${roadmap.meta.acceptedThrough} not in ROADMAP ledger`);
  } else {
    note(`acceptedThrough ${roadmap.meta.acceptedThrough} present in ledger`);
  }
  if (!idName.has(String(roadmap.meta.nextProductSlice))) {
    fail("NEXT_SLICE_MISSING", `nextProductSlice ${roadmap.meta.nextProductSlice} not in ROADMAP ledger`);
  } else {
    note(`nextProductSlice ${roadmap.meta.nextProductSlice} present in ledger`);
  }
  if (!idName.has(String(roadmap.meta.gtmBoundary))) {
    fail("GTM_BOUNDARY_MISSING", `gtmBoundary ${roadmap.meta.gtmBoundary} not in ROADMAP ledger`);
  } else {
    note(`gtmBoundary ${roadmap.meta.gtmBoundary} present in ledger`);
  }

  // Hard identity checks
  const requiredMeanings = {
    "IMP-021": "Checkout",
    "IMP-022": "Payment",
    "IMP-023": "Order",
    "IMP-024": "Customer Ordering Transport",
    "IMP-025": "Customer Ordering UX",
    "IMP-035": "Initial Administration",
    "IMP-040": "Launch Validation",
  };
  for (const [id, needle] of Object.entries(requiredMeanings)) {
    const name = idName.get(id) || "";
    if (!name.includes(needle)) {
      fail("IMP_MEANING", `${id} expected to include "${needle}", got "${name}"`);
    } else {
      note(`${id} meaning OK (${name})`);
    }
  }
}

function checkDecisionRegister(decision) {
  if (!decision) return;
  const text = decision.text;
  // Unique decision IDs from the Current Global Decisions table only.
  const globalSection =
    text.split("## 2. Current Global Decisions")[1]?.split("## 3.")[0] || text;
  const ids = [...globalSection.matchAll(/\|\s*(D-\d+)\s*\|/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail("DECISION_ID_DUP", `Duplicate decision ID ${id}`);
    seen.add(id);
  }
  note(`Decision IDs unique (${seen.size} table IDs scanned)`);

  // ADR references that appear as ADR-xxx should exist as files (explicit paths;
  // avoid readdir on /mnt/c decisions/ which can ENOMEM under WSL/NTFS).
  const adrRefs = [...new Set([...text.matchAll(/\bADR-(\d{3})\b/g)].map((m) => m[1]))];
  for (const num of adrRefs) {
    const prefix = path.join(projectRoot, "docs/platform/decisions", `ADR-${num}-`);
    // Probe common existence via known filenames from register + glob-free check
    const known = [
      "001-digitalocean-platform",
      "002-environments-ci-cd-release-model",
      "003-modular-monolith-node-typescript",
      "004-identity-authentication-sessions",
      "005-organization-outlet-authorization",
      "006-food-catalog-assortment-availability",
      "007-pricing-tax-charges-promotions",
      "008-serviceability-cart-checkout",
      "009-payments-webhooks-refunds-reconciliation",
      "010-order-lifecycle-operations-console",
      "011-delivery-providers-dispatch-fulfilment",
      "012-notifications-whatsapp-assisted-commerce",
      "013-postgresql-drizzle-migrations-persistence",
      "014-http-api-route-handlers-contracts",
      "015-configuration-secrets-feature-flags",
    ];
    const slug = known.find((k) => k.startsWith(`${num}-`));
    const candidate = slug
      ? path.join(projectRoot, "docs/platform/decisions", `ADR-${slug}.md`)
      : `${prefix}.md`;
    if (!existsSync(candidate)) {
      fail("ADR_MISSING", `Referenced ADR-${num} file not found (expected ${path.relative(projectRoot, candidate)})`);
    }
  }

  // Supersession structural: D-356 should mention ADR-014; ADR-014 file should mention D-356
  const adr014 = resolvePlatformDoc("docs/platform/decisions/ADR-014-http-api-route-handlers-contracts.md");
  if (existsSync(adr014)) {
    const body = readFileSync(adr014, "utf8");
    if (!/SUPERSEDED/i.test(body) || !/D-356/.test(body)) {
      fail("ADR014_SUPERSESSION", "ADR-014 must be marked SUPERSEDED and reference D-356");
    } else {
      note("ADR-014 ↔ D-356 supersession references present");
    }
  }

  for (const id of ["D-356", "D-357", "D-358", "D-359", "D-360"]) {
    if (!seen.has(id)) {
      fail("DECISION_REQUIRED_IDS", `DECISION-REGISTER must register ${id}`);
    }
  }

  const d356Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-356\s*\|/.test(line));
  if (d356Row && !/\|\s*AMENDED\s*\|/.test(d356Row)) {
    fail("D356_AMENDMENT", "D-356 must be AMENDED (topology decided by D-359)");
  } else if (d356Row) {
    note("D-356 status AMENDED (topology amendment via D-359)");
  }

  const d359Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-359\s*\|/.test(line));
  const d360Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-360\s*\|/.test(line));
  if (d359Row && !/\|\s*CURRENT\s*\|/.test(d359Row)) {
    fail("D359_STATUS", "D-359 must be CURRENT");
  }
  if (d360Row && !/\|\s*CURRENT\s*\|/.test(d360Row)) {
    fail("D360_STATUS", "D-360 must be CURRENT");
  }
  if (d359Row && d360Row) {
    note("D-359 and D-360 registered as CURRENT");
  }
}

function checkImp024ArchitectureLock(roadmap, state, architecture) {
  const artifactRel = "docs/platform/capabilities/IMP-024-customer-ordering-transport.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP024_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-024 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP024_CAPABILITY_LOCK", "IMP-024 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/COMPLETE_AND_ACCEPTED/.test(body)) {
      fail(
        "IMP024_CAPABILITY_IMPL",
        "IMP-024 capability artifact must declare COMPLETE_AND_ACCEPTED after independent acceptance",
      );
    }
    for (const id of ["D-359", "D-360"]) {
      if (!body.includes(id)) {
        fail("IMP024_CAPABILITY_DECISIONS", `IMP-024 capability artifact must cite ${id}`);
      }
    }
  }

  if (roadmap) {
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-024\s*\|/.test(line),
    );
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-024\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP024_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-024 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-024 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (futureRow) {
      fail(
        "IMP024_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-024 after acceptance",
      );
    }
    if (!/ARCHITECTURE_LOCKED/.test(roadmap.text)) {
      fail(
        "IMP024_ARCH_LOCK_RETAINED",
        "ROADMAP must retain ARCHITECTURE_LOCKED language for IMP-024 architecture",
      );
    } else {
      note("IMP-024 architecture lock retained in ROADMAP");
    }
  }

  if (state) {
    if (!/ARCHITECTURE_LOCKED/.test(state.text) || !/COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP024_STATE_IMPL",
        "STATE must record IMP-024 ARCHITECTURE_LOCKED and COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("STATE records IMP-024 architecture locked / COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-025 implementation:[\s\S]{0,40}COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP025_STATE_IMPL",
        "STATE must record IMP-025 implementation COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("STATE records IMP-025 COMPLETE_AND_ACCEPTED");
    }
    if (state.meta.pendingAcceptance && state.meta.pendingAcceptance !== "NONE") {
      fail(
        "IMP025_PENDING_META",
        `STATE pendingAcceptance must be NONE after IMP-025 acceptance, got ${JSON.stringify(state.meta.pendingAcceptance)}`,
      );
    } else {
      note("STATE pendingAcceptance=NONE");
    }
  }

  if (architecture) {
    if (/IMP-024[\s\S]{0,120}NOT_DECIDED/.test(architecture.text)) {
      fail("IMP024_ARCH_UNDECIDED", "ARCHITECTURE.md must not leave IMP-024 topology as NOT_DECIDED");
    } else {
      note("ARCHITECTURE.md no longer marks IMP-024 topology NOT_DECIDED");
    }
    if (!/customer-commerce/.test(architecture.text) || !/D-359/.test(architecture.text)) {
      fail("IMP024_ARCH_TOPOLOGY", "ARCHITECTURE.md must reference customer-commerce and D-359");
    } else {
      note("ARCHITECTURE.md references customer-commerce / D-359");
    }
    if (/Compose wiring awaits implementation/.test(architecture.text)) {
      fail(
        "IMP024_ARCH_STALE_WIRING",
        "ARCHITECTURE.md must not claim customer-commerce Compose wiring still awaits implementation",
      );
    } else {
      note("ARCHITECTURE.md does not claim customer-commerce wiring awaits implementation");
    }
  }
}

function checkImp025ArchitectureLock(roadmap, state, architecture) {
  const artifactRel = "docs/platform/capabilities/IMP-025-customer-ordering-ux.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP025_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-025 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP025_CAPABILITY_LOCK", "IMP-025 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/COMPLETE_AND_ACCEPTED/.test(body)) {
      fail(
        "IMP025_CAPABILITY_IMPL",
        "IMP-025 capability artifact must declare COMPLETE_AND_ACCEPTED after independent acceptance",
      );
    }
    for (const id of ["D-356", "D-357", "D-359", "D-360"]) {
      if (!body.includes(id)) {
        fail("IMP025_CAPABILITY_DECISIONS", `IMP-025 capability artifact must cite ${id}`);
      }
    }
    if (!/sessionStorage/.test(body)) {
      fail("IMP025_GUEST_TOKEN_STORAGE", "IMP-025 capability artifact must lock sessionStorage");
    }
    if (!/ordering-catalog\.json/.test(body)) {
      fail(
        "IMP025_ORDERING_CATALOG",
        "IMP-025 capability artifact must lock src/data/ordering-catalog.json destination",
      );
    }
  }

  if (roadmap) {
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-025\s*\|/.test(line),
    );
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-025\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP025_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-025 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-025 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (futureRow) {
      fail(
        "IMP025_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-025 after acceptance",
      );
    }
    if (/IMP-025[\s\S]{0,80}IMPLEMENTATION_IN_PROGRESS/.test(roadmap.text)) {
      fail(
        "IMP025_ROADMAP_IMPL_STARTED",
        "ROADMAP must not mark IMP-025 IMPLEMENTATION_IN_PROGRESS after acceptance",
      );
    }
  }

  if (state) {
    if (!/IMP-025 architecture:[\s\S]{0,40}ARCHITECTURE_LOCKED/.test(state.text)) {
      fail("IMP025_STATE_ARCH_LOCK", "STATE must record IMP-025 architecture ARCHITECTURE_LOCKED");
    } else {
      note("STATE records IMP-025 architecture locked");
    }
    if (/IMP-025[\s\S]{0,80}IMPLEMENTATION_IN_PROGRESS/.test(state.text)) {
      fail(
        "IMP025_STATE_IMPL_STARTED",
        "STATE must not mark IMP-025 IMPLEMENTATION_IN_PROGRESS after acceptance",
      );
    }
  }

  if (architecture) {
    if (!/IMP-025-customer-ordering-ux\.md/.test(architecture.text)) {
      fail(
        "IMP025_ARCH_REFERENCE",
        "ARCHITECTURE.md must reference IMP-025 capability architecture artifact",
      );
    } else {
      note("ARCHITECTURE.md references IMP-025 capability artifact");
    }
  }
}

function checkTechnicalInventory() {
  const journalPath = path.join(projectRoot, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    fail("JOURNAL_MISSING", "drizzle/meta/_journal.json missing");
    return;
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries = journal.entries || [];
  const latest = entries[entries.length - 1];
  if (!latest || latest.tag !== "0017_order") {
    fail("LATEST_MIGRATION", `Expected latest migration tag 0017_order, got ${latest && latest.tag}`);
  } else {
    note("Latest migration tag 0017_order");
  }
  const sqlFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) => f.endsWith(".sql"));
  if (sqlFiles.length !== 18 || entries.length !== 18) {
    fail(
      "MIGRATION_COUNT",
      `Expected 18 migrations, got sql=${sqlFiles.length} journal=${entries.length}`,
    );
  } else {
    note("Migration count 18");
  }

  // Application tables
  const schemaDir = path.join(projectRoot, "src/platform/database/schema");
  let tableCount = 0;
  for (const name of readdirSync(schemaDir)) {
    if (!name.endsWith(".ts")) continue;
    const t = readFileSync(path.join(schemaDir, name), "utf8");
    tableCount += [...t.matchAll(/appSchema\.table\(/g)].length;
  }
  if (tableCount !== 92) {
    fail("TABLE_COUNT", `Expected 92 appSchema.table declarations, got ${tableCount}`);
  } else {
    note("Application table count 92");
  }

  const catalog = readFileSync(path.join(projectRoot, "src/shared/access-control/catalog.ts"), "utf8");
  const permMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\];/);
  const roleMatch = catalog.match(/export const ROLE_KEYS = \[([\s\S]*?)\];/);
  const perms = permMatch ? [...permMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  const roles = roleMatch ? [...roleMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  if (perms.length !== 55) fail("PERMISSION_COUNT", `Expected 55 permissions, got ${perms.length}`);
  else note("Permission count 55");
  if (roles.length !== 7) fail("ROLE_COUNT", `Expected 7 roles, got ${roles.length}`);
  else note("Role count 7");

  // Default docker services: top-level compose services without profiles, before volumes:
  const compose = readFileSync(path.join(projectRoot, "compose.yaml"), "utf8");
  const servicesSection = compose.split(/^volumes:/m)[0] || compose;
  const services = [];
  let current = null;
  let currentHasProfile = false;
  for (const line of servicesSection.split(/\r?\n/)) {
    const svc = line.match(/^  ([a-z0-9-]+):\s*$/);
    if (svc) {
      if (current && !currentHasProfile) services.push(current);
      current = svc[1];
      currentHasProfile = false;
      continue;
    }
    if (current && /^\s+profiles:/.test(line)) currentHasProfile = true;
  }
  if (current && !currentHasProfile) services.push(current);
  const defaultServices = services.filter((s) =>
    ["postgres", "app", "customer-auth", "workforce-auth", "customer-commerce"].includes(s),
  );
  if (defaultServices.length !== 5 || services.length !== 5) {
    fail(
      "DOCKER_DEFAULT_COUNT",
      `Expected exactly 5 default services [postgres, app, customer-auth, workforce-auth, customer-commerce], found [${services.join(", ")}]`,
    );
  } else {
    note("Default Docker service count 5");
  }
}

function checkStaticWeb() {
  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  if (!existsSync(nextConfigPath)) {
    fail("NEXT_CONFIG_MISSING", "next.config.ts missing");
    return;
  }
  const nextConfig = readFileSync(nextConfigPath, "utf8");
  if (!/output:\s*"export"/.test(nextConfig)) {
    fail("STATIC_EXPORT", 'next.config.ts must set output: "export"');
  } else {
    note('Next.js static export (output: "export") verified');
  }

  const apiDir = path.join(projectRoot, "src/app/api");
  if (existsSync(apiDir) && statSync(apiDir).isDirectory()) {
    // Allow empty or non-commerce trees only if no production route handlers for commerce
    const walk = (dir) => {
      const out = [];
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
      }
      return out;
    };
    const files = walk(apiDir);
    if (files.length > 0) {
      fail(
        "APP_API_PRESENT",
        `Unexpected production files under src/app/api: ${files.map((f) => path.relative(projectRoot, f)).join(", ")}`,
      );
    } else {
      note("src/app/api has no production route files");
    }
  } else {
    note("No src/app/api production commerce tree");
  }
}

function checkAgentsPointer() {
  const agents = path.join(projectRoot, "AGENTS.md");
  if (!existsSync(agents)) {
    fail("AGENTS_MISSING", "AGENTS.md missing");
    return;
  }
  const text = readFileSync(agents, "utf8");
  for (const needle of ["VISION.md", "ROADMAP.md", "STATE.md", "ARCHITECTURE.md", "decision-register.md", "ALIGNMENT_GATE"]) {
    if (!text.includes(needle)) fail("AGENTS_POINTER", `AGENTS.md missing required pointer/content: ${needle}`);
  }
  if (/implementation-roadmap\.md/.test(text) && !/SUPERSEDED|not an independent roadmap/i.test(text)) {
    // soft: AGENTS should not treat implementation-roadmap as current
    if (/order fixed by\s*`?docs\/platform\/implementation-roadmap/i.test(text)) {
      fail("AGENTS_STALE_ROADMAP", "AGENTS.md still treats implementation-roadmap.md as sequencing authority");
    }
  }
  note("AGENTS.md points at canonical authorities");
}

function checkSupersededRoadmap() {
  const p = resolvePlatformDoc("docs/platform/implementation-roadmap.md");
  if (!existsSync(p)) {
    fail("HISTORICAL_ROADMAP_MISSING", "implementation-roadmap.md missing (should remain as SUPERSEDED history)");
    return;
  }
  const text = readFileSync(p, "utf8");
  if (!/SUPERSEDED/i.test(text) || !/ROADMAP\.md/.test(text)) {
    fail("HISTORICAL_ROADMAP_MARK", "implementation-roadmap.md must be marked SUPERSEDED by ROADMAP.md");
  } else {
    note("implementation-roadmap.md marked SUPERSEDED");
  }
}

export function runProjectConsistency() {
  findings.length = 0;

  const vision = loadCanonical("docs/platform/VISION.md", "PRODUCT_VISION", ["version", "lastReviewed"]);
  const architecture = loadCanonical("docs/platform/ARCHITECTURE.md", "GLOBAL_ARCHITECTURE", [
    "architectureVersion",
    "lastReviewed",
  ]);
  const decision = loadCanonical(
    DECISION_REGISTER_REL,
    "DECISION_AUTHORITY",
    ["decisionRegisterVersion", "lastReviewed"],
    { exact: true },
  );
  if (decision) {
    note(`Decision Register exact path OK (${DECISION_REGISTER_REL})`);
    const tracked = gitTracksExactPath(DECISION_REGISTER_REL);
    if (tracked === "missing") {
      fail(
        "DECISION_REGISTER_PATH",
        `git does not track exact path ${DECISION_REGISTER_REL}`,
      );
    } else if (tracked === "exact") {
      note(`Decision Register git-tracked exact path OK (${DECISION_REGISTER_REL})`);
    } else {
      note("Decision Register git path check unavailable; directory-entry exact check applied");
    }
  }
  const roadmap = loadCanonical("docs/platform/ROADMAP.md", "IMPLEMENTATION_SEQUENCE", [
    "roadmapVersion",
    "acceptedThrough",
    "currentProductSlice",
    "nextProductSlice",
    "gtmBoundary",
    "lastReviewed",
  ]);
  const state = loadCanonical("docs/platform/STATE.md", "ACCEPTED_STATE", [
    "stateVersion",
    "acceptedThrough",
    "currentProductSlice",
    "nextProductSlice",
    "pendingAcceptance",
    "governanceHealth",
    "lastReviewed",
  ]);

  if (vision && vision.meta.version !== "VISION-1") {
    fail("VISION_VERSION", `Expected VISION-1, got ${vision.meta.version}`);
  }
  if (architecture && architecture.meta.architectureVersion !== "ARCH-R5") {
    fail("ARCH_VERSION", `Expected ARCH-R5, got ${architecture.meta.architectureVersion}`);
  }
  if (decision && decision.meta.decisionRegisterVersion !== "DR-2") {
    fail("DR_VERSION", `Expected DR-2, got ${decision.meta.decisionRegisterVersion}`);
  }
  if (roadmap && roadmap.meta.roadmapVersion !== "GTM-R7") {
    fail("ROADMAP_VERSION", `Expected GTM-R7, got ${roadmap.meta.roadmapVersion}`);
  }
  if (state && state.meta.stateVersion !== "STATE-R6") {
    fail("STATE_VERSION", `Expected STATE-R6, got ${state.meta.stateVersion}`);
  }
  if (state && state.meta.governanceHealth === "ALIGNED") {
    // During reconciliation install this may still be RECONCILIATION_REQUIRED;
    // ALIGNED is allowed only after independent acceptance — do not fail either way structurally.
    note("governanceHealth=ALIGNED (independent acceptance may have applied)");
  } else if (state) {
    note(`governanceHealth=${state.meta.governanceHealth}`);
  }

  checkRoadmapState(roadmap, state);
  checkDecisionRegister(decision);
  checkImp024ArchitectureLock(roadmap, state, architecture);
  checkImp025ArchitectureLock(roadmap, state, architecture);
  checkTechnicalInventory();
  checkStaticWeb();
  checkAgentsPointer();
  checkSupersededRoadmap();

  return findings;
}

function main() {
  const results = runProjectConsistency();
  const failures = results.filter((f) => !f.ok);
  for (const f of results) {
    const prefix = f.ok ? "OK  " : "FAIL";
    const code = f.code ? `[${f.code}] ` : "";
    console.log(`${prefix} ${code}${f.message}`);
  }
  console.log("");
  console.log(`project:consistency — ${failures.length === 0 ? "PASS" : "FAIL"} (${failures.length} failure(s))`);
  process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
