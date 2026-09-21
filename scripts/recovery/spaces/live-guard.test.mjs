import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLogicalSpacesObjectStore,
  resolveLayer2ObjectStore,
} from "./logical.mjs";
import { createObjectStore } from "./index.mjs";

const LOGICAL_ENV = {
  BOBA_RECOVERY_LOGICAL_SPACES_BUCKET: "boba-logical",
  BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
  BOBA_RECOVERY_LOGICAL_SPACES_REGION: "nyc3",
  BOBA_LOGICAL_SPACES_ACCESS_KEY_ID: "AKIA_TEST",
  BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY: "secret_test",
};

test("createLogicalSpacesObjectStore blocks before any network request without live flag", async () => {
  let requests = 0;
  const blocked = await createLogicalSpacesObjectStore(
    { ...LOGICAL_ENV },
    {},
    {
      transport: async () => {
        requests += 1;
        throw new Error("network must not be reached");
      },
    },
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "REAL_SPACES_FLAG_REQUIRED");
  assert.equal(requests, 0);

  const live = await createLogicalSpacesObjectStore(
    { ...LOGICAL_ENV, BOBA_RECOVERY_REAL_SPACES: "1" },
    {},
    {
      transport: async () => {
        requests += 1;
        return {
          statusCode: 200,
          headers: {},
          body: Buffer.from("<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>"),
        };
      },
    },
  );
  assert.equal(live.ok, true, live.reason);
  assert.equal(requests, 1);
  assert.equal(live.objectStore.liveAuthorized, true);
  assert.equal(live.objectStore.versioningVerified, true);
});

test("resolveLayer2ObjectStore selects local store without live flag and Spaces only with live flag", async () => {
  const local = await resolveLayer2ObjectStore({}, { "local-store": "/tmp/boba-local-store-test" });
  assert.equal(local.ok, true);
  assert.equal(local.mode, "local");

  const blocked = await resolveLayer2ObjectStore({ ...LOGICAL_ENV }, {});
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "REAL_SPACES_FLAG_REQUIRED");

  let requests = 0;
  const spaces = await resolveLayer2ObjectStore(
    { ...LOGICAL_ENV, BOBA_RECOVERY_REAL_SPACES: "1" },
    {},
    {
      transport: async () => {
        requests += 1;
        return {
          statusCode: 200,
          headers: {},
          body: Buffer.from("<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>"),
        };
      },
    },
  );
  assert.equal(spaces.ok, true, spaces.reason);
  assert.equal(spaces.mode, "spaces");
  assert.equal(requests, 1);
});

test("createObjectStore refuses Spaces backend without live flag", () => {
  assert.throws(
    () =>
      createObjectStore({
        backend: "spaces",
        bucket: "boba-logical",
        endpoint: "https://nyc3.digitaloceanspaces.com",
        region: "nyc3",
        accessKeyId: "AKIA_TEST",
        secretAccessKey: "secret_test",
        credentialEnvPrefix: "BOBA_LOGICAL_SPACES",
        versioningEnabled: true,
      }),
    /REAL_SPACES_FLAG_REQUIRED/,
  );
});

test("Layer 2 Spaces backup verifies versioning before the first PUT", async () => {
  const { createHash } = await import("node:crypto");
  const { mkdtempSync, rmSync } = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { runLogicalBackup } = await import("../layer2/backup.mjs");
  const { generateRunId } = await import("../run-id.mjs");
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-versioning-preflight-"));
  try {
    /** @type {string[]} */
    const ops = [];
    const objectStore = {
      backend: "s3",
      liveAuthorized: true,
      versioningVerified: false,
      async verifyBucketVersioning() {
        ops.push("versioning");
        return { ok: true, status: "ENABLED" };
      },
      async putObject({ key, body }) {
        ops.push(`put:${key}`);
        return { key, size: body.length };
      },
      async verifyRemoteSha256({ key, expectedSha256Hex }) {
        ops.push(`verify:${key}`);
        return { ok: true, key, actualSha256Hex: expectedSha256Hex };
      },
      async getObject() {
        return { body: Buffer.from("{}") };
      },
    };
    const runId = generateRunId({ now: new Date(Date.UTC(2026, 8, 20, 16, 0, 0)), randomHex: "1111111111111111" });
    const result = await runLogicalBackup({
      runId,
      objectStore,
      evidenceDir: path.join(root, "evidence"),
      recipients: ["age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3waw4h"],
      sourceIdentity: "prod-db-1",
      dumpFn: async () => Buffer.from("PGDUMP"),
      encryptFn: async (_opts, plaintext) => ({
        ok: true,
        ciphertext: Buffer.from(`AGE:${createHash("sha256").update(plaintext).digest("hex")}`),
      }),
      withHeavyOpLock: async (_opts, fn) => ({ ok: true, status: "ACQUIRED", result: await fn() }),
    });
    assert.equal(result.ok, true, result.reason);
    assert.equal(ops[0], "versioning");
    assert.equal(ops.some((op) => op.startsWith("put:")), true);
    assert.ok(ops.indexOf("versioning") < ops.findIndex((op) => op.startsWith("put:")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
