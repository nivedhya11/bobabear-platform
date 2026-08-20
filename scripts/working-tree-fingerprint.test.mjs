import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  compareUtf8Bytes,
  computeWorkingTreeFingerprint,
  listUntrackedNonIgnored,
} from "./working-tree-fingerprint.mjs";

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "fingerprint-test",
  GIT_AUTHOR_EMAIL: "fingerprint-test@example.com",
  GIT_COMMITTER_NAME: "fingerprint-test",
  GIT_COMMITTER_EMAIL: "fingerprint-test@example.com",
  LC_ALL: "C",
};

function git(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    env: gitEnv,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout || `git ${args.join(" ")}`);
  return result;
}

function initRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-fp-"));
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.name", "fingerprint-test"]);
  git(dir, ["config", "user.email", "fingerprint-test@example.com"]);
  writeFileSync(path.join(dir, "tracked.txt"), "tracked-v1\n");
  writeFileSync(path.join(dir, ".gitignore"), "ignored.txt\nsecret.bin\n");
  git(dir, ["add", "tracked.txt", ".gitignore"]);
  git(dir, ["commit", "-q", "-m", "init"]);
  return dir;
}

function porcelain(repo) {
  return spawnSync("git", ["-C", repo, "status", "--porcelain=v1"], {
    encoding: "utf8",
    env: gitEnv,
  }).stdout;
}

function oldPorcelainFingerprint(repo) {
  const status = porcelain(repo);
  const hash = createHash("sha256");
  hash.update(status);
  for (const line of status.split("\n").filter(Boolean)) {
    let filePath = line.slice(3);
    if (filePath.includes(" -> ")) filePath = filePath.split(" -> ", 1)[1];
    const abs = path.join(repo, filePath);
    try {
      if (statSync(abs).isFile()) {
        hash.update(filePath);
        hash.update("\0");
        hash.update(readFileSync(abs));
      }
    } catch {
      // directory or missing — old algorithm skipped contents
    }
  }
  return hash.digest("hex");
}

describe("working-tree fingerprint", () => {
  it("compareUtf8Bytes is locale-independent byte order", () => {
    const names = ["é.txt", "a.txt", "Z.txt", "b.txt"];
    const sorted = [...names].sort(compareUtf8Bytes);
    const expected = [...names].sort((a, b) =>
      Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8")),
    );
    assert.deepEqual(sorted, expected);
  });

  it("same repository state produces the same hash", () => {
    const repo = initRepo();
    try {
      const a = computeWorkingTreeFingerprint(repo);
      const b = computeWorkingTreeFingerprint(repo);
      assert.equal(a.digest, b.digest);
      assert.match(a.digest, /^[0-9a-f]{64}$/);
      assert.equal(a.algorithm, "boba-bear-working-tree-fingerprint-v1");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("tracked file content change produces a different hash", () => {
    const repo = initRepo();
    try {
      const before = computeWorkingTreeFingerprint(repo).digest;
      writeFileSync(path.join(repo, "tracked.txt"), "tracked-v2\n");
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(after, before);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("untracked file addition produces a different hash", () => {
    const repo = initRepo();
    try {
      const before = computeWorkingTreeFingerprint(repo).digest;
      writeFileSync(path.join(repo, "new.txt"), "added\n");
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(after, before);
      assert.ok(listUntrackedNonIgnored(repo).includes("new.txt"));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("untracked content change inside an already-untracked directory produces a different hash", () => {
    const repo = initRepo();
    try {
      mkdirSync(path.join(repo, "docs/platform/experience"), { recursive: true });
      writeFileSync(path.join(repo, "docs/platform/experience/example.md"), "one\n");
      const porcelainBefore = porcelain(repo);
      assert.match(porcelainBefore, /\?\? docs\//);
      assert.equal(porcelainBefore.includes("example.md"), false);
      const before = computeWorkingTreeFingerprint(repo).digest;
      const oldBefore = oldPorcelainFingerprint(repo);

      writeFileSync(path.join(repo, "docs/platform/experience/example.md"), "two\n");
      const porcelainAfter = porcelain(repo);
      assert.equal(porcelainAfter, porcelainBefore);
      const after = computeWorkingTreeFingerprint(repo).digest;
      const oldAfter = oldPorcelainFingerprint(repo);

      assert.notEqual(after, before);
      assert.equal(oldAfter, oldBefore, "old porcelain fingerprint must stay blind to nested untracked edits");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("untracked file deletion produces a different hash", () => {
    const repo = initRepo();
    try {
      mkdirSync(path.join(repo, "untracked-dir"));
      writeFileSync(path.join(repo, "untracked-dir/a.txt"), "keep\n");
      writeFileSync(path.join(repo, "untracked-dir/b.txt"), "drop\n");
      const before = computeWorkingTreeFingerprint(repo).digest;
      rmSync(path.join(repo, "untracked-dir/b.txt"));
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(after, before);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("ignored-file change does not affect the hash", () => {
    const repo = initRepo();
    try {
      writeFileSync(path.join(repo, "ignored.txt"), "secret-a\n");
      const before = computeWorkingTreeFingerprint(repo).digest;
      writeFileSync(path.join(repo, "ignored.txt"), "secret-b\n");
      writeFileSync(path.join(repo, "secret.bin"), Buffer.from([0, 1, 2, 3]));
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.equal(after, before);
      assert.equal(listUntrackedNonIgnored(repo).includes("ignored.txt"), false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("filesystem enumeration order does not change the hash", () => {
    const repoA = initRepo();
    const repoB = initRepo();
    try {
      mkdirSync(path.join(repoA, "bundle"));
      writeFileSync(path.join(repoA, "bundle/z.txt"), "z\n");
      writeFileSync(path.join(repoA, "bundle/a.txt"), "a\n");
      writeFileSync(path.join(repoA, "bundle/m.txt"), "m\n");

      mkdirSync(path.join(repoB, "bundle"));
      writeFileSync(path.join(repoB, "bundle/m.txt"), "m\n");
      writeFileSync(path.join(repoB, "bundle/a.txt"), "a\n");
      writeFileSync(path.join(repoB, "bundle/z.txt"), "z\n");

      assert.equal(
        computeWorkingTreeFingerprint(repoA).digest,
        computeWorkingTreeFingerprint(repoB).digest,
      );
    } finally {
      rmSync(repoA, { recursive: true, force: true });
      rmSync(repoB, { recursive: true, force: true });
    }
  });

  it("hashes binary untracked files by content", () => {
    const repo = initRepo();
    try {
      writeFileSync(path.join(repo, "blob.bin"), Buffer.from([0, 1, 2, 255, 0]));
      const before = computeWorkingTreeFingerprint(repo).digest;
      writeFileSync(path.join(repo, "blob.bin"), Buffer.from([0, 1, 2, 255, 1]));
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(after, before);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("staged-only index change produces a different hash with identical worktree bytes", () => {
    const repo = initRepo();
    try {
      writeFileSync(path.join(repo, "tracked.txt"), "staged-and-worktree\n");
      const unstaged = computeWorkingTreeFingerprint(repo).digest;
      git(repo, ["add", "tracked.txt"]);
      const staged = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(staged, unstaged);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("tracked deletion produces a different hash", () => {
    const repo = initRepo();
    try {
      const before = computeWorkingTreeFingerprint(repo).digest;
      rmSync(path.join(repo, "tracked.txt"));
      const after = computeWorkingTreeFingerprint(repo).digest;
      assert.notEqual(after, before);
      assert.equal(
        computeWorkingTreeFingerprint(repo).files.find((f) => f.path === "tracked.txt")?.kind,
        "missing",
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("does not include absolute paths in the digest inputs listing", () => {
    const repo = initRepo();
    try {
      writeFileSync(path.join(repo, "rel.txt"), "ok\n");
      const result = computeWorkingTreeFingerprint(repo);
      for (const file of result.files) {
        assert.equal(path.isAbsolute(file.path), false);
        assert.equal(file.path.includes(repo), false);
      }
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
