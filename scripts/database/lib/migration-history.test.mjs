// Runs under Node's built-in test runner (`node --test`), not Vitest — see
// scripts/lib/vitest-result-validation.test.mjs for the same convention.
// Every fixture lives under a fresh OS temporary directory; the real
// drizzle/ directory is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { checkMigrationHistory, validateJournalShape, validateMigrationFiles, validateSnapshotAncestry } from "./migration-history.mjs";

function makeFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-bear-migration-history-test-"));
  mkdirSync(path.join(dir, "meta"), { recursive: true });
  return dir;
}

function writeValidFixture(dir) {
  writeFileSync(
    path.join(dir, "meta", "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "postgresql",
      entries: [{ idx: 0, version: "7", when: 1000, tag: "0000_foo", breakpoints: true }],
    }),
  );
  writeFileSync(path.join(dir, "0000_foo.sql"), "CREATE SCHEMA IF NOT EXISTS \"app\";\n");
  writeFileSync(
    path.join(dir, "meta", "0000_snapshot.json"),
    JSON.stringify({ id: "id-0", prevId: "00000000-0000-0000-0000-000000000000" }),
  );
}

test("checkMigrationHistory accepts a valid, minimal migration history", () => {
  const dir = makeFixture();
  try {
    writeValidFixture(dir);
    const result = checkMigrationHistory({ drizzleDir: dir });
    assert.equal(result.ok, true, result.findings.join("; "));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkMigrationHistory fails when the journal is missing", () => {
  const dir = makeFixture();
  try {
    const result = checkMigrationHistory({ drizzleDir: dir });
    assert.equal(result.ok, false);
    assert.match(result.findings[0], /does not exist/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkMigrationHistory fails when the journal is malformed JSON", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "meta", "_journal.json"), "{not json");
    const result = checkMigrationHistory({ drizzleDir: dir });
    assert.equal(result.ok, false);
    assert.match(result.findings[0], /not valid JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateJournalShape rejects a duplicate idx", () => {
  const findings = validateJournalShape({
    entries: [
      { idx: 0, tag: "a", when: 1 },
      { idx: 0, tag: "b", when: 2 },
    ],
  });
  assert.ok(findings.some((f) => /duplicate idx/.test(f)));
});

test("validateJournalShape rejects a duplicate tag", () => {
  const findings = validateJournalShape({
    entries: [
      { idx: 0, tag: "a", when: 1 },
      { idx: 1, tag: "a", when: 2 },
    ],
  });
  assert.ok(findings.some((f) => /duplicate tag/.test(f)));
});

test("validateJournalShape rejects a non-monotonic idx", () => {
  const findings = validateJournalShape({
    entries: [
      { idx: 1, tag: "a", when: 1 },
      { idx: 0, tag: "b", when: 2 },
    ],
  });
  assert.ok(findings.some((f) => /monotonically increasing/.test(f)));
});

test("validateJournalShape rejects a non-monotonic timestamp", () => {
  const findings = validateJournalShape({
    entries: [
      { idx: 0, tag: "a", when: 2 },
      { idx: 1, tag: "b", when: 1 },
    ],
  });
  assert.ok(findings.some((f) => /"when" timestamp is not monotonically increasing/.test(f)));
});

test("validateMigrationFiles reports a missing SQL file for a journal entry", () => {
  const dir = makeFixture();
  try {
    const findings = validateMigrationFiles(dir, { entries: [{ idx: 0, tag: "0000_missing", when: 1 }] });
    assert.ok(findings.some((f) => /has no corresponding/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateMigrationFiles reports an untracked SQL file", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0001_untracked.sql"), "SELECT 1;\n");
    const findings = validateMigrationFiles(dir, { entries: [] });
    assert.ok(findings.some((f) => /is not represented in the journal/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateMigrationFiles reports an empty SQL file", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_empty.sql"), "   \n");
    const findings = validateMigrationFiles(dir, { entries: [{ idx: 0, tag: "0000_empty", when: 1 }] });
    assert.ok(findings.some((f) => /is empty/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateMigrationFiles reports an unresolved conflict marker", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_conflict.sql"), "<<<<<<< HEAD\nSELECT 1;\n=======\n>>>>>>> branch\n");
    const findings = validateMigrationFiles(dir, { entries: [{ idx: 0, tag: "0000_conflict", when: 1 }] });
    assert.ok(findings.some((f) => /conflict marker/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateMigrationFiles detects a real-looking credential without echoing it", () => {
  const dir = makeFixture();
  const sentinel = "DO_NOT_LEAK_DATABASE_SECRET_94817";
  try {
    writeFileSync(
      path.join(dir, "0000_credential.sql"),
      `-- postgresql://leaked_user:${sentinel}@example.invalid:5432/db\nSELECT 1;\n`,
    );
    const findings = validateMigrationFiles(dir, { entries: [{ idx: 0, tag: "0000_credential", when: 1 }] });
    assert.ok(findings.some((f) => /appears to contain a real credential/.test(f)));
    assert.ok(!findings.some((f) => f.includes(sentinel)), "finding must never echo the credential value");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateSnapshotAncestry reports a missing snapshot", () => {
  const dir = makeFixture();
  try {
    const findings = validateSnapshotAncestry(dir, { entries: [{ idx: 0, tag: "0000_foo", when: 1 }] });
    assert.ok(findings.some((f) => /missing or invalid snapshot/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("validateSnapshotAncestry reports a broken prevId chain", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "meta", "0000_snapshot.json"), JSON.stringify({ id: "id-0", prevId: "wrong" }));
    const findings = validateSnapshotAncestry(dir, { entries: [{ idx: 0, tag: "0000_foo", when: 1 }] });
    assert.ok(findings.some((f) => /snapshot ancestry break/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
