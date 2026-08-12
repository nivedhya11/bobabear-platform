// Runs under Node's built-in test runner (`node --test`), not Vitest — see
// scripts/lib/vitest-result-validation.test.mjs for the same convention.
// Every fixture lives under a fresh OS temporary directory; the real
// drizzle/ directory is never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  SEAL_CONFIRMATION_TOKEN,
  buildSealedManifest,
  diffManifestAgainstJournal,
  hashMigrationFile,
} from "./migration-integrity.mjs";
import { parseConfirmation } from "../seal-migrations.mjs";

function makeFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-bear-migration-integrity-test-"));
  return dir;
}

const journalWithOne = { entries: [{ idx: 0, tag: "0000_foo", when: 1 }] };
const journalWithTwo = {
  entries: [
    { idx: 0, tag: "0000_foo", when: 1 },
    { idx: 1, tag: "0001_bar", when: 2 },
  ],
};

test("diffManifestAgainstJournal reports no findings and no unsealed for a matching manifest", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1;\n");
    const hash = hashMigrationFile(path.join(dir, "0000_foo.sql"));
    const manifest = { version: 1, algorithm: "sha256", migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: hash }] };

    const { findings, unsealed } = diffManifestAgainstJournal({ journal: journalWithOne, manifest, drizzleDir: dir });
    assert.deepEqual(findings, []);
    assert.deepEqual(unsealed, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diffManifestAgainstJournal reports a new unsealed migration", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1;\n");
    writeFileSync(path.join(dir, "0001_bar.sql"), "SELECT 2;\n");
    const hash = hashMigrationFile(path.join(dir, "0000_foo.sql"));
    const manifest = { version: 1, algorithm: "sha256", migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: hash }] };

    const { findings, unsealed } = diffManifestAgainstJournal({ journal: journalWithTwo, manifest, drizzleDir: dir });
    assert.deepEqual(findings, []);
    assert.deepEqual(unsealed, ["0001_bar"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diffManifestAgainstJournal reports a hash mismatch when historical SQL was modified", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1; -- modified\n");
    const manifest = {
      version: 1,
      algorithm: "sha256",
      migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: "0".repeat(64) }],
    };

    const { findings } = diffManifestAgainstJournal({ journal: journalWithOne, manifest, drizzleDir: dir });
    assert.ok(findings.some((f) => /hash mismatch/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("diffManifestAgainstJournal reports a sealed migration removed from the journal", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1;\n");
    const hash = hashMigrationFile(path.join(dir, "0000_foo.sql"));
    const manifest = { version: 1, algorithm: "sha256", migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: hash }] };

    const { findings } = diffManifestAgainstJournal({ journal: { entries: [] }, manifest, drizzleDir: dir });
    assert.ok(findings.some((f) => /historical removal/.test(f)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildSealedManifest appends a new migration in journal order", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1;\n");
    writeFileSync(path.join(dir, "0001_bar.sql"), "SELECT 2;\n");
    const existingHash = hashMigrationFile(path.join(dir, "0000_foo.sql"));
    const manifest = { version: 1, algorithm: "sha256", migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: existingHash }] };

    const result = buildSealedManifest({ journal: journalWithTwo, manifest, drizzleDir: dir, tagsToSeal: ["0001_bar"] });
    assert.equal(result.ok, true);
    assert.deepEqual(result.manifest.migrations.map((m) => m.tag), ["0000_foo", "0001_bar"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildSealedManifest refuses to replace an existing hash", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0000_foo.sql"), "SELECT 1;\n");
    const manifest = { version: 1, algorithm: "sha256", migrations: [{ tag: "0000_foo", path: "drizzle/0000_foo.sql", sha256: "irrelevant" }] };

    const result = buildSealedManifest({ journal: journalWithOne, manifest, drizzleDir: dir, tagsToSeal: ["0000_foo"] });
    assert.equal(result.ok, false);
    assert.match(result.reason, /already-sealed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildSealedManifest refuses to seal a tag absent from the journal", () => {
  const dir = makeFixture();
  try {
    writeFileSync(path.join(dir, "0001_bar.sql"), "SELECT 2;\n");
    const manifest = { version: 1, algorithm: "sha256", migrations: [] };

    const result = buildSealedManifest({ journal: journalWithOne, manifest, drizzleDir: dir, tagsToSeal: ["0001_bar"] });
    assert.equal(result.ok, false);
    assert.match(result.reason, /absent from the journal/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseConfirmation accepts the exact sealing confirmation token", () => {
  assert.equal(parseConfirmation([`--confirm=${SEAL_CONFIRMATION_TOKEN}`]), SEAL_CONFIRMATION_TOKEN);
});

test("parseConfirmation returns a wrong token unchanged (caller compares against the constant)", () => {
  assert.equal(parseConfirmation(["--confirm=WRONG_TOKEN"]), "WRONG_TOKEN");
  assert.notEqual(parseConfirmation(["--confirm=WRONG_TOKEN"]), SEAL_CONFIRMATION_TOKEN);
});

test("parseConfirmation returns null when no confirmation flag is present", () => {
  assert.equal(parseConfirmation([]), null);
});
