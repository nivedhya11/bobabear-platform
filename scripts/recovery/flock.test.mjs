import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { withHeavyOpLock } from "./flock.mjs";

function tempLock() {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-flock-"));
  return { root, lockPath: path.join(root, "heavy.lock") };
}

test("sequential heavy ops acquire the lock", async () => {
  const { root, lockPath } = tempLock();
  try {
    const first = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "a" }, async () => "one");
    assert.equal(first.status, "ACQUIRED");
    assert.equal(first.ok, true);
    assert.equal(first.result, "one");

    const second = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "b" }, async () => "two");
    assert.equal(second.status, "ACQUIRED");
    assert.equal(second.result, "two");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("contention returns SKIPPED_LOCK_HELD, never success", async () => {
  const { root, lockPath } = tempLock();
  try {
    let release;
    const hold = new Promise((resolve) => {
      release = resolve;
    });

    const holderPromise = withHeavyOpLock({ lockPath, waitMs: 0, operation: "holder" }, async () => {
      await hold;
      return "held";
    });

    // Wait until holder has acquired.
    await delay(150);

    const contested = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "contender" }, async () => {
      return "should-not-run";
    });
    assert.equal(contested.ok, false);
    assert.equal(contested.status, "SKIPPED_LOCK_HELD");
    assert.notEqual(contested.status, "ACQUIRED");
    assert.equal(contested.result, undefined);

    release();
    const holder = await holderPromise;
    assert.equal(holder.status, "ACQUIRED");
    assert.equal(holder.result, "held");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("after release a subsequent operation can acquire", async () => {
  const { root, lockPath } = tempLock();
  try {
    const first = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "first" }, async () => "done");
    assert.equal(first.status, "ACQUIRED");
    const second = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "second" }, async () => "again");
    assert.equal(second.status, "ACQUIRED");
    assert.equal(second.result, "again");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("callback failure releases lock safely; next acquire succeeds", async () => {
  const { root, lockPath } = tempLock();
  try {
    const failed = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "boom" }, async () => {
      throw new Error("callback exploded");
    });
    assert.equal(failed.ok, false);
    assert.equal(failed.status, "FAILED");
    assert.match(failed.reason ?? "", /callback exploded/);

    const after = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "after-fail" }, async () => "ok");
    assert.equal(after.status, "ACQUIRED");
    assert.equal(after.result, "ok");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lock result contains no secret material", async () => {
  const { root, lockPath } = tempLock();
  try {
    const secret = "PGBACKREST_CIPHER_PASS=super-secret-cipher";
    const result = await withHeavyOpLock({ lockPath, waitMs: 0, operation: "scan" }, async () => ({
      note: "ok",
    }));
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes("super-secret"), false);
    assert.equal(result.status, "ACQUIRED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
