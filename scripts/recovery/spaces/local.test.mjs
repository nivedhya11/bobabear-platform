import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  SPACES_OBJECT_LOCK_WORM_REQUIRED,
  SPACES_VERSIONING,
  SPACES_VERSIONING_IS_IMMUTABILITY,
  validateSpacesBucketConfig,
} from "./config.mjs";
import { createLocalObjectStore } from "./local.mjs";
import { createObjectStore } from "./index.mjs";
import { createHash } from "node:crypto";

test("Spaces config requires versioning and rejects WORM/mutex claims", () => {
  assert.equal(SPACES_VERSIONING, "ENABLED");
  assert.equal(SPACES_VERSIONING_IS_IMMUTABILITY, false);
  assert.equal(SPACES_OBJECT_LOCK_WORM_REQUIRED, false);

  const ok = validateSpacesBucketConfig({
    bucket: "boba-layer2",
    endpoint: "https://nyc3.digitaloceanspaces.com",
    credentialEnvPrefix: "BOBA_SPACES_L2",
    versioningEnabled: true,
  });
  assert.equal(ok.ok, true);

  assert.equal(
    validateSpacesBucketConfig({
      bucket: "x",
      endpoint: "https://example",
      credentialEnvPrefix: "P",
      versioningEnabled: false,
    }).ok,
    false,
  );
  assert.equal(
    validateSpacesBucketConfig({
      bucket: "x",
      endpoint: "https://example",
      credentialEnvPrefix: "P",
      versioningEnabled: true,
      worm: true,
    }).ok,
    false,
  );
  assert.equal(
    validateSpacesBucketConfig({
      bucket: "x",
      endpoint: "https://example",
      credentialEnvPrefix: "P",
      versioningEnabled: true,
      conditionalCreateMutex: true,
    }).ok,
    false,
  );
});

test("local object store put/get/verify and unique keys", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-spaces-local-"));
  try {
    const store = createLocalObjectStore({ localRoot: root, bucket: "test" });
    const body = Buffer.from("encrypted-artifact");
    await store.putObject({ key: "logical/run1/dump.age", body });
    const got = await store.getObject({ key: "logical/run1/dump.age" });
    assert.equal(got.body.equals(body), true);

    const sha = createHash("sha256").update(body).digest("hex");
    const verified = await store.verifyRemoteSha256({ key: "logical/run1/dump.age", expectedSha256Hex: sha });
    assert.equal(verified.ok, true);

    await store.putObject({ key: "logical/run2/dump.age", body: Buffer.from("other") });
    const listed = await store.listObjects({ prefix: "logical/" });
    assert.equal(listed.contents.length, 2);

    const viaFactory = createObjectStore({ backend: "local", localRoot: root, bucket: "test" });
    assert.equal(viaFactory.backend, "local");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("createObjectStore fails closed on unknown backend", () => {
  assert.throws(() => createObjectStore({ backend: "mystery" }), /unknown object store backend/);
});
